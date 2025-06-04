import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { createRetrieverTool } from "langchain/tools/retriever";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation, Annotation, END } from "@langchain/langgraph";
import { AlibabaTongyiEmbeddings } from "@langchain/community/embeddings/alibaba_tongyi";
import MilvusClient from '@zilliz/milvus2-sdk-node';
import PDFVectorDB from './pdfVectordb.js';
import { vectorsData } from './Data.js';
import { pull } from "langchain/hub";
import z from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Embeddings } from "@langchain/core/embeddings";
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';


interface StreamResponse {
    content?: string;
    error?: string;
    isLastMessage?: boolean;
}


// TypeScript 中处理 ESM 的 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置 dotenv
dotenv.config({ path: path.resolve(__dirname, '.env') });

// 配置参数
const config = {
    collectionName: 'research_papers',
    dimension: 1536,
    pdfDirectory: "./table_tennis_papers", // PDF存放目录
    chunkSize: 1500, // 文本块大小
    chunkOverlap: 200 //块间重叠
};

// Express 应用配置
const app = express();

// CORS 配置
const allowedOrigins = [
    'https://paper-generation-client.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

const corsOptions: cors.CorsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// 中间件
app.use(cors(corsOptions));
app.use(bodyParser.json());

// 根路由
app.get('/', (_req: Request, res: Response) => {
    res.json({ message: 'API is running' });
});

// 环境变量检查
if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_BASE_URL) {
    console.error('Missing required environment variables');
    process.exit(1);
}

// 全局PDF向量数据库实例
let globalPdfVectorDB: PDFVectorDB | null = null;

// 初始化向量数据库
async function initializeVectorDB() {
    try {
        console.log('正在初始化向量数据库...');
        globalPdfVectorDB = new PDFVectorDB(config);

        // 初始化Milvus连接
        await globalPdfVectorDB.initMilvus();

        // 检查集合是否存在，如果不存在则构建向量数据库
        try {
            // 尝试执行一个简单的搜索来验证向量数据库是否已构建
            await globalPdfVectorDB.searchSimilarDocuments('测试', 1);
            console.log('✅ 向量数据库已存在且可用');
        } catch (error) {
            console.log('向量数据库不存在或不完整，开始构建...');
            await globalPdfVectorDB.buildVectorDB();
            console.log('✅ 向量数据库构建完成');
        }

        console.log('向量数据库初始化完成');
    } catch (error) {
        console.error('向量数据库初始化失败:', error);
        // 不抛出错误，允许应用继续运行，但检索功能会不可用
        globalPdfVectorDB = null;
    }
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
    }, 30000);

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
        console.log(111, enhancedPrompt);

        // 3. 调用大模型生成论文
        const stream = await openai.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: ''
                },
                {
                    role: 'user',
                    content: enhancedPrompt
                }
            ],
            model: 'doubao-1-5-lite-32k-250115',
            stream: true,
            temperature: 0.7, // 适度的创造性
            max_tokens: 10000,  // 确保足够的输出长度
        });

        // 4. 流式返回结果
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
    const basePrompt = `# 高质量SCI论文写作任务

## 用户需求分析
**核心需求：** ${userRequest}

## 可用资源评估
${retrievalContext ? 
    `**检索到的相关文献资料：**
    ${retrievalContext}
    
    **文献利用策略：**
    - 优先引用近5年内的高质量研究
    - 重点关注方法学创新和实证发现
    - 构建完整的理论支撑体系` : 
    `**当前状态：** 无文献检索结果，将基于运动科学领域的专业知识进行撰写`}

`;

    const instructionPrompt = `## 撰写指导原则

### 📋 1. 大纲契合度要求（权重30%）
- **严格遵循用户提供的论文大纲结构**
- 确保每个章节内容与大纲标题和要求100%契合
- 章节间逻辑关系清晰，论证层次递进
- 如大纲不够详细，主动补充合理的子章节结构

### 📚 2. 文献整合策略（权重25%）
${retrievalContext ? 
    `**基于检索文献的写作策略：**
    - 深度分析提供的文献材料，提取核心观点和数据
    - 将文献内容与大纲要求有机结合，避免生硬拼接
    - 对文献观点进行批判性分析和拓展
    - 识别研究空白，突出本研究的创新性
    - 确保所有引用准确标注，遵循APA/Vancouver格式` :
    `**无文献资料的写作策略：**
    - 基于运动科学、训练学、运动生理学等专业知识
    - 模拟合理的实验设计和数据分析
    - 确保内容的科学性和逻辑性
    - 提供符合学科规范的研究方法`}

### ✍️ 3. 学术写作标准（权重25%）
**语言质量要求：**
- 使用准确的学术术语和专业表达
- 句式多样化，避免重复和口语化
- 逻辑连接词恰当使用，确保文章流畅性
- 中英文术语对照准确，缩写使用规范

**结构完整性：**
- 标题：简洁明确，体现研究核心（15-20字）
- 摘要：目的-方法-结果-结论四要素完整（250-300字）
- 引言：背景阐述→研究现状→问题识别→研究目标（800-1200字）
- 方法：详细可重复的实验设计（1500-2000字）
- 结果：客观描述+图表展示（2000-2500字）
- 讨论：结果解释+文献对比+意义阐述（1500-2000字）
- 结论：简明总结+局限性+展望（400-500字）

### 📊 4. 科学严谨性（权重20%）
**实验设计要求：**
- 明确的研究假设和可测量的变量
- 合理的样本量计算和分组策略
- 可信的测量工具和数据收集方法
- 适当的统计分析方法选择

**数据呈现标准：**
- 图表设计清晰，标题和标签完整
- 统计结果报告规范（均值±标准差，P值等）
- 效应量计算和临床意义讨论
- 结果解释客观，避免过度推论

## 🎯 具体执行策略

### 阶段一：内容规划（基于大纲）
1. **分析大纲结构**：理解每个章节的核心目标
2. **分配字数权重**：确保重点章节篇幅充足
3. **设计论证逻辑**：建立章节间的逻辑关联

### 阶段二：文献整合（如有提供）
1. **文献分类整理**：按研究方法、发现、理论分类
2. **观点提取综合**：识别支持和反对的证据
3. **研究空白识别**：找出创新点和贡献点

### 阶段三：内容创作
1. **遵循学术规范**：确保每个部分符合期刊要求
2. **保持逻辑一致**：前后呼应，论证清晰
3. **突出创新价值**：明确研究的理论和实践意义

## 📝 质量控制标准

### 内容质量指标：
- ✅ 大纲契合度：≥95%
- ✅ 学术语言流畅度：≥90%
- ✅ 逻辑结构完整性：≥95%
- ✅ 文献整合有效性：≥85%

### 格式规范检查：
- ✅ 章节标题层次清晰
- ✅ 图表编号和引用规范
- ✅ 参考文献格式统一
- ✅ 专业术语使用准确

### 字数分配建议：
- 摘要：250-300字
- 引言：800-1200字
- 方法：1500-2000字
- 结果：2000-2500字
- 讨论：1500-2000字
- 结论：400-500字
- **总计：6450-8500字（目标9000+字，为图表说明和深入分析预留空间）**

## 🚀 开始撰写

请基于以上指导原则，严格按照用户提供的大纲${retrievalContext ? '和文献材料' : ''}，撰写一篇符合SCI一区标准的高质量学术论文。

**特别提醒：**
- 📌 每个段落都要有明确的主题句
- 📌 确保数据和结论的逻辑一致性  
- 📌 适当使用过渡句连接各部分内容
- 📌 保持客观科学的写作态度

---

**现在开始正式撰写论文：**`;

    return basePrompt + instructionPrompt;
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
                await initializeVectorDB();
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

    const initialPort = parseInt(process.env.PORT || '3000', 10);
    startServer(initialPort);
} else {
    // 在Vercel环境中也要初始化向量数据库
    initializeVectorDB().catch((error) => {
        console.error('Vercel环境向量数据库初始化失败:', error);
    });
}

export default app; 