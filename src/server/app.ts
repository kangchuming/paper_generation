import { TavilySearch } from "@langchain/tavily";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { HumanMessage, AIMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";
import { createRetrieverTool } from "langchain/tools/retriever";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation, Annotation, END } from "@langchain/langgraph";
import { StringOutputParser } from "@langchain/core/output_parsers";
import type { RunnableConfig } from "@langchain/core/runnables";
import { formatDocumentsAsString } from "langchain/util/document";
import { type DocumentInterface } from "@langchain/core/documents";
import { tool } from "@langchain/core/tools"
import PDFVectorDB from './pdfVectordb.js';
import { pull } from "langchain/hub";
import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Embeddings } from "@langchain/core/embeddings";
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { config } from './config/index.js';
import { corsMiddleware } from './middleware/cors.js';
import { vectorDBService } from './services/vectorDB.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { BaseRetriever } from "@langchain/core/retrievers";

// 类型定义
interface StreamResponse {
    content?: string;
    error?: string;
    isLastMessage?: boolean;
}

// Express 应用配置
const app = express();

// 中间件
app.use(corsMiddleware);
app.use(bodyParser.json());

// 根路由
app.get('/', (_req: Request, res: Response) => {
    res.json({ message: 'API is running' });
});

dotenv.config();

class PDFRetriever extends BaseRetriever {
    lc_namespace = ["pdf", "retrievers"];

    constructor(private pdfVectorDB: PDFVectorDB) {
        super();
    }

    async _getRelevantDocuments(query: string): Promise<DocumentInterface[]> {
        if(!this.pdfVectorDB) return [];

        try {
            const searchResults = await this.pdfVectorDB.searchSimilarDocuments(query, 5);

            // 解析检索结果
            const results = searchResults.results || [];

            return results.map((result: any) => ({
                pageContent: result.text || result.entity?.text || '',
                metadata: {
                    source: result.source || result.entity?.source || '',
                    page: result.page || result.entity?.page || 0,
                    score: result.score || result.distance || 0
                }
            }));
        } catch(err) {
            console.error('检索失败:', err);
            return [];
        }
    }
}

// 全局PDF向量数据库实例
let globalPdfVectorDB: PDFVectorDB | null = null;

const retriever = globalPdfVectorDB ? new PDFRetriever(globalPdfVectorDB) : null;

const model = new ChatOpenAI({
    modelName: 'doubao-1-5-lite-32k-250115',
    temperature: 0,
    maxTokens: 8000,
    streaming: true,
    openAIApiKey: process.env.OPENAI_API_KEY,
    configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
    }
})

async function retrieve(
    state: typeof GraphState.State,
    config?: RunnableConfig
): Promise<Partial<typeof GraphState.State>> {
    console.log("---RETRIEVE---");

    if(!retriever) {
        return {documents: []};
    }

    const documents = await retriever
        .withConfig({runName: "FetchRelevantDocuments"})
        .invoke(state.question, config);
    
    return {
        documents,
    }
    
}

// 环境变量检查
if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_BASE_URL) {
    console.error('Missing required environment variables');
    process.exit(1);
}



// OpenAI 客户端配置
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
});

// 主要处理函数
async function main(message: string, res: Response): Promise<void> {
    let isEnded = false;

    try {
        const stream = await openai.chat.completions.create({
            messages: [
                { role: 'user', content: message },
            ],
            model: 'doubao-1-5-lite-32k-250115',
            stream: true,
        });

        for await (const chunk of stream) {
            if (isEnded) break;

            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                try {
                    if (!res.writableEnded) {
                        const response: StreamResponse = {
                            content,
                            isLastMessage: chunk.choices[0].finish_reason === 'stop'
                        };
                        res.write(`data: ${JSON.stringify(response)}\n\n`);
                    } else {
                        isEnded = true;
                        break;
                    }
                } catch (error) {
                    console.error('写入数据时出错:', error);
                    isEnded = true;
                    break;
                }
            }
        }
    } catch (error) {
        console.error('处理消息时出错: ', error);
        if (!res.writableEnded) {
            const errorResponse: StreamResponse = { error: '处理消息时出错' };
            res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
        }
    } finally {
        if (!res.writableEnded) {
            res.end();
        }
    }
}

// 聊天流式响应路由
app.post('/api/chat/stream', async (req: Request, res: Response) => {
    const { message } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    let isEnded = false;

    const timeout = setTimeout(() => {
        if (!isEnded && !res.writableEnded) {
            const timeoutResponse: StreamResponse = { error: '请求超时，请重试' };
            res.write(`data: ${JSON.stringify(timeoutResponse)}\n\n`);
            res.end();
            isEnded = true;
        }
    }, 8000);

    try {
        console.log('Stream started');
        await main(message, res);
    } catch (error) {
        console.error('处理请求出错：', error);
        if (!isEnded && !res.writableEnded) {
            const errorResponse: StreamResponse = { error: '内部服务器错误' };
            res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
            res.end();
            isEnded = true;
        }
    } finally {
        clearTimeout(timeout);
        console.log('Stream ended');
    }

    req.on('close', () => {
        clearTimeout(timeout);
        if (!isEnded && !res.writableEnded) {
            res.end();
            isEnded = true;
        }
    });
});

const GraphState = Annotation.Root({
    documents: Annotation<DocumentInterface[]>({
        reducer: (x,y) => y ?? x ?? [],
    }),
    question: Annotation<string>({
        reducer: (x,y) => y ?? x ?? "",
    }),
    generation: Annotation<string>({
        reducer: (x, y) => y ?? x,
        default: () => "",
    }),
    generationVQuestionGrade: Annotation<string>({
        reducer: (x, y) => y ?? x,
    }),
    generationVDocumentsGrade: Annotation<string>({
        reducer: (x, y) => y ?? x
    })
})

// 增强的论文生成函数，集成检索结果
async function generatePaperWithRetrieval(message: string, res: Response): Promise<void> {
    let isEnded = false;
    let retrievalContext = '';
    try {
        // 1. 首先进行文档检索
        if (globalPdfVectorDB) {
            console.log('正在检索相关文档...');
            try {
                const searchResults = await globalPdfVectorDB.searchSimilarDocuments(message, 5);

                // 解析检索结果
                const results = searchResults.results || [];
                if (results.length > 0) {
                    const relevantDocs = results.map((result: any, index: number) => {
                        const text = result.text || result.entity?.text || '';
                        const source = result.source || result.entity?.source || '';
                        const page = result.page || result.entity?.page || 0;
                        const score = result.score || result.distance || 0;

                        return {
                            index: index + 1,
                            content: text.trim(),
                            source: source,
                            page: page,
                            relevanceScore: score
                        };
                    });

                    // 构建检索上下文
                    retrievalContext = relevantDocs.map((doc: {
                        index: number;
                        content: string;
                        source: string;
                        page: number;
                        relevanceScore: number;
                    }) =>
                        `[文档${doc.index}] 来源: ${path.basename(doc.source)} (第${doc.page}页)\n内容: ${doc.content}`
                    ).join('\n\n');
                    console.log(`检索到 ${relevantDocs.length} 个相关文档片段`);
                } else {
                    console.log('未检索到相关文档');
                }
            } catch (searchError) {
                console.error('文档检索失败:', searchError);
                // 继续执行，但不使用检索结果
            }
        }

    
        // 2. 构建优化的prompt
        const enhancedPrompt = buildAcademicPrompt(message, retrievalContext);

        // 3. 构建网络搜索
        const agentTools = [new TavilySearch({maxResults: 3})];
        const toolNode = new ToolNode(agentTools);

        // 4. 使用 LangChain ChatOpenAI 生成论文
        const chatModel = new ChatOpenAI({
            modelName: 'doubao-1-5-lite-32k-250115',
            temperature: 0.7,
            maxTokens: 8000,
            streaming: true,
            openAIApiKey: process.env.OPENAI_API_KEY,
            configuration: {
                baseURL: process.env.OPENAI_BASE_URL,
            }
        }).bindTools(agentTools);;

        // 5. 决定是否继续流程
        const shouldContinue = ({messages} : typeof MessagesAnnotation.State) => {
             const lastMessage = messages[messages.length - 1] as AIMessage;

             if(lastMessage.tool_calls?.length) {
                return "tools";
             }

             return "__end__";
        }

        //  6. 定义调用model
        const callModel = async(state: typeof MessagesAnnotation.State) => {
            const response = await chatModel.invoke(state.messages);

            return {messages: [response]};
        }

        // 7. 定义workflow
        const workflow = new StateGraph(MessagesAnnotation)
            .addNode("agent", callModel)
            .addNode("tools", toolNode)
            .addEdge("__start__", "agent")
            .addEdge("tools", "agent")
            .addConditionalEdges("agent", shouldContinue);

        
        // 8. 编译Langchain
        const app = workflow.compile();
        

        // 3. 调用大模型生成论文
        const systemPrompt = `您是一位在学术写作领域极具权威性的专家，尤其擅长根据论文大纲创作顶尖水平的 SCI 论文。现需您为运动科学领域创作一篇高质量的 SCI 一区论文，具体要求如下：
                    一、深度契合大纲
                    仔细研读并透彻理解所提供的论文大纲，确保生成的论文内容与大纲架构和核心主题高度契合。论文的每一部分，从章节标题到段落内容，都应紧密围绕大纲展开，不得偏离大纲所设定的研究方向与论述重点。
                    运用您深厚的学术功底和专业的语言表达能力，构建起一个科学、严谨且逻辑严密的论述体系。在阐述观点、分析问题和呈现研究成果时，务必保证语言的准确性和精炼性，避免出现模糊不清或表述不当的情况。无论是专业术语的运用，还是语句的组织，都要彰显学术论文的专业性。
                    二、权威论据支撑
                    广泛查阅并参考权威且前沿的学术文献，确保所引用的文献均为近五年内发表在运动科学领域核心期刊上的研究成果。这些文献将为论文提供坚实有力的论据支持，增强论文的可信度和说服力。文献的选择应涵盖经典研究以及最新的突破成果，全面展现领域内的研究动态。
                    在论文中适当引用文献内容时，需准确标注出处，遵循 SCI 一区期刊的引用规范。同时，在论文末尾的参考文献部分，详细列出所有引用文献的完整信息，包括作者、题目、期刊名称、发表年份、卷号、页码等，确保参考文献格式统一、准确无误，便于读者查阅追溯。
                    三、格式严格规范
                    标题：设计一个精准恰当、能够高度概括论文核心内容的标题。标题应简洁明了，控制在合理字数范围内，同时具备足够的吸引力，能够在众多学术文献中脱颖而出，激发读者的兴趣。
                    摘要：撰写一个全面准确的摘要，概括论文的研究目的、方法、主要结果和结论。摘要应具有独立性和自含性，让读者在不阅读全文的情况下，即可了解论文的关键信息。字数严格控制在 200 - 300 字左右，语言精炼，重点突出。
                    引言：创作一段引人入胜的引言，阐述研究背景、目的和意义。通过对相关领域研究现状的系统回顾，梳理已有研究成果，明确指出当前研究的不足，从而自然流畅地引出本文的研究内容与创新点。引言部分应能够吸引读者的注意力，为后文的论述做好铺垫。
                    正文 - 实验设计与实施：
                    详细阐述实验的设计思路，包括实验对象的选择标准、样本量的确定依据、分组方式等。例如，若研究某种运动训练方法对运动员体能的影响，需说明选取特定运动员群体的原因，以及如何将其分为实验组和对照组。
                    描述实验所采用的仪器设备及工具，精确说明其型号、规格以及在实验中的作用。如使用专业的运动监测设备，需介绍设备的品牌、功能特点以及如何确保数据采集的准确性。
                    分步介绍实验的具体操作流程，包括运动训练的方案、数据采集的时间节点和方式等。例如，详细描述实验组接受的特殊训练内容、频率和时长，以及对照组的常规训练安排，同时说明在实验过程中如何收集运动员的体能数据、生理指标等。
                    正文 - 实验结果与分析：
                    以清晰、直观的图表（如柱状图、折线图、散点图等）展示实验数据，图表需标注清晰的坐标轴标签、图例等信息，确保读者能够快速理解数据所表达的含义。
                    对实验数据进行深入分析，运用合适的统计方法（如方差分析、相关性分析等）验证研究假设，解释数据背后的科学意义。例如，通过数据分析说明实验组和对照组在体能指标上是否存在显著差异，以及这些差异与所研究的运动训练方法之间的关联。
                    结合已有研究成果，对实验结果进行讨论和对比，分析本研究的优势与局限性，进一步凸显研究的创新性和价值。
                    结论：对论文的研究成果进行深刻精炼的总结，强调研究的重要发现和贡献，明确阐述研究成果对运动科学领域理论和实践的推动作用。同时，客观、诚实地指出研究的局限性，如实验样本的局限性、研究方法的不足等，并基于此对未来该领域的研究方向提出具有前瞻性的展望与建议。结论应简洁明了，具有一定的启发性。
                    参考文献：按照 SCI 一区期刊的格式要求，规范详尽地列出所有引用的参考文献。参考文献的格式应统一、准确，便于读者查阅。
                    四、字数达标要求
                    论文的总字数应达到 9000 字以上，不包括参考文献部分。请合理分配各部分字数，确保论文内容丰富且重点突出。实验设计与实施、实验结果与分析等核心部分应保证充足的篇幅，以充分展示研究的科学性和严谨性。
                    五、性能指标
                    论文内容与大纲的精准性和相关性应达到 95% 以上，确保所有内容都紧密围绕大纲展开，切实回答大纲所设定的研究问题。
                    语言表达的流畅度和专业性需达到 90% 以上。使用规范的学术语言，避免口语化表达和语法错误，确保论文的语言质量符合 SCI 一区期刊的要求。句子结构合理，段落衔接自然，逻辑过渡顺畅。
                    六、沟通与优化
                    在开始创作前，若对大纲中的任何部分存在疑问或不明确之处，请及时向我提问，确保您完全理解大纲意图。这包括对研究问题的界定、实验设计的细节等方面的疑问。
                    具备根据我提供的反馈进行精准修改和完善优化的能力，能够快速响应并调整论文内容，以满足不断变化的需求。无论是内容的增减、结构的调整还是语言的润色，都要能够高效完成。
                    七、学术道德
                    始终严格遵守学术道德和相关法律规范，坚决杜绝任何抄袭或剽窃他人成果的行为。确保论文的原创性，所有观点和内容均为独立创作或基于合法引用。引用他人成果时，需按照规范进行标注，尊重知识产权。
                    请根据以上要求，结合所提供的论文大纲，为我创作一篇高质量的 SCI 一区论文。这篇论文对我的工作至关重要，期待您能创作出符合要求的佳作。

                    请根据用户需求和提供的参考资料，生成符合学术标准的高质量论文内容。`

        const messages = [
            new SystemMessage(systemPrompt),
            new HumanMessage(enhancedPrompt)
        ];

        const stream = await chatModel.stream(messages)

        // 4. 流式返回结果
        for await (const chunk of stream) {
            if (isEnded) break;

            const content = chunk.content || '';
            if (content) {
                try {
                    if (!res.writableEnded) {
                        const response: StreamResponse = {
                            content: typeof content === 'string' ? content : '',
                            isLastMessage: false
                        };
                        res.write(`data: ${JSON.stringify(response)}\n\n`);
                    } else {
                        isEnded = true;
                        break;
                    }
                } catch (error) {
                    console.error('写入数据时出错:', error);
                    isEnded = true;
                    break;
                }
            }
        }
    } catch (error) {
        console.error('生成论文时出错: ', error);
        if (!res.writableEnded) {
            const errorResponse: StreamResponse = { error: '生成论文时出错，请重试' };
            res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
        }
    } finally {
        if (!res.writableEnded) {
            res.end();
        }
    }
}

// 构建学术论文写作prompt
function buildAcademicPrompt(userRequest: string, retrievalContext: string): string {
    const basePrompt = `## 论文写作任务

**用户需求：** ${userRequest}

`;

    const contextPrompt = retrievalContext ? `## 参考文献资料

以下是从专业文献库中检索到的相关研究资料，请在撰写论文时合理参考和引用：

${retrievalContext}

` : '';

    const instructionPrompt = `## 写作指导

请基于上述用户需求${retrievalContext ? '和参考资料' : ''}，撰写一篇高质量的学术论文。请注意：

### 内容要求：
1. **学术规范**：遵循标准学术论文格式（标题、摘要、关键词、引言、文献综述、方法、结果、讨论、结论、参考文献等）
2. **专业深度**：展现专业的体育科学和运动训练知识
3. **逻辑严密**：确保论述逻辑清晰，论证充分有力
4. **创新性**：在现有研究基础上提出新的见解或改进方案
5. **实用性**：结合实际训练和比赛应用场景

### 写作风格：
- 使用严谨的学术语言和专业术语
- 保持客观、中性的学术写作态度
- 适当引用权威文献和数据支撑观点
- 结构层次分明，段落逻辑清晰

### 特别注意：
${retrievalContext ?
            `- 请合理整合和引用提供的参考资料，但不要简单复制
- 基于参考资料的内容进行深入分析和拓展
- 确保引用的准确性和相关性` :
            `- 基于体育科学和运动训练的专业知识进行撰写
- 确保内容的专业性和学术价值`}

请开始撰写论文：`;

    return basePrompt + contextPrompt + instructionPrompt;
}

// 论文生成路由
app.post('/api/chat/paper/stream', async (req: Request, res: Response) => {
    const { message } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    try {
        await generatePaperWithRetrieval(message, res);
    } catch (error) {
        console.error('处理请求时出错：', error);
        res.status(500).json({ error: '内部服务器错误' });
    }
});

// 服务器启动逻辑
if (!process.env.VERCEL) {
    const startServer = (port: number) => {
        const server = app.listen(port, async () => {
            console.log(`服务器正在运行在 http://localhost:${port}`);
            
            // 初始化向量数据库
            console.log('正在初始化向量数据库...');
            try {
                await vectorDBService.initialize();
                console.log('✅ 向量数据库初始化完成');
            } catch (error) {
                console.error('❌ 向量数据库初始化失败:', error);
                console.log('⚠️  应用将在没有检索功能的情况下运行');
            }
        }).on('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`端口 ${port} 已被占用，尝试使用端口 ${port + 1}`);
                startServer(port + 1);
            } else {
                console.error('启动服务器时出错:', err);
            }
        });
    };

    startServer(config.server.port);
} else {
    // 在Vercel环境中也要初始化向量数据库
    vectorDBService.initialize().catch((error) => {
        console.error('Vercel环境向量数据库初始化失败:', error);
    });
}

export default app; 