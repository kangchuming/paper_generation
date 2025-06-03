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
    dimension: 768,
    pdfDirectory: "./table_tennis_papers", // PDF存放目录
    chunkSize: 1500, // 文本块大小
    chunkOverlap: 200 //块间重叠
};


const COLLECTION_NAME = 'data_query_example';

// const address = 'localhost:19530';  // Milvus默认端口
// const username = '';  // Docker版本默认无需用户名
// const password = '';  // Docker版本默认无需密码

// (async () => {
//     const milvusClient = new MilvusClient({
//         address: 'localhost:19530',
//         username: 'username',
//         password: 'Aa12345!!'
//     });

//     const create = await milvusClient.createCollection({
//         collection_name: COLLECTION_NAME,
//         fields: [
//             {
//                 name: 'age',
//                 description: 'ID field',
//                 data_type: DataType.Int64,
//                 is_primary_key: true,
//                 autoID: true,
//             },
//             {
//                 name: 'vector',
//                 description: 'Vector field',
//                 data_type: DataType.FloatVector,
//                 dim: 8,
//             },
//             {name: 'height', description: 'int64 field', data_type: DataType.Int64},
//             {
//                 name: 'name',
//                 description: 'VarChar field',
//                 data_type: DataType.VarChar,
//                 max_length: 128,
//             },
//         ],
//     });
//     console.log('Create collection is finished.', create);

//     const params: InsertReq = {
//         collection_name: COLLECTION_NAME,
//         fields_data: vectorsData,
//     };

//     // 将数据导入集合
//     await milvusClient.insert(params);
//     console.log('Data is inserted.');

//     // 创建索引
//     const createIndex = await milvusClient.createIndex({
//         collection_name: COLLECTION_NAME,
//         field_name: 'vector',
//         metric_type: 'L2',
//     });

//     console.log('Index is created', createIndex);

//     // 搜索前需要加载集合
//     const load = await milvusClient.loadCollectionSync({
//         collection_name: COLLECTION_NAME,
//     });

//     console.log('Collection is loaded.', load);

//     // 搜索
//     for (let i=0;i<1;i++) {
//         console.time('Search time');
//         const search =await milvusClient.search({
//             collection_name: COLLECTION_NAME,
//             vector: vectorsData[i]['vector'],
//             output_fileds: ['age'],
//             limit: 5,
//         });
//         console.timeEnd('Search time');
//         console.log('Search result', search);
//     }

//     await milvusClient.dropCollection({
//         collection_name: COLLECTION_NAME
//     })
// })();

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

async function testMilvus() {
    try {
        //  1. 初始化向量数据库
        const pdfVectorDB = new PDFVectorDB(config);

        // 2. 构建向量数据库
        console.log('开始构建向量数据库...');
        await pdfVectorDB.buildVectorDB();
        console.log('向量数据库构建完成!');

        // 3. 测试搜索功能
        console.log("\n测试搜索功能...");
        const query = '张继科';
        const topK = 3;

        console.log(`查询: "${query}"`);
        const results = await pdfVectorDB.searchSimilarDocuments(query, topK);

        // 4. 打印搜索结果
        console.log("\n搜索结果:");
        console.log("原始搜索结果:", JSON.stringify(results, null, 2));
        
        // 检查不同可能的数据结构
        const searchData = results.data || results.results || results;
        if (Array.isArray(searchData) && searchData.length > 0) {
            searchData.forEach((doc: any, i: number) => {
                // 尝试不同的字段名
                const text = doc.text || doc.entity?.text || doc.fields?.text || '';
                const source = doc.source || doc.entity?.source || doc.fields?.source || '';
                const page = doc.page || doc.entity?.page || doc.fields?.page || 0;
                const fileName = path.basename(source);
                console.log(`${i + 1}. [${fileName} - 页 ${page}]`);
                console.log(`   ${text.substring(0, 150)}...`);
                console.log('-------------------------------------');
            })
        } else {
            console.log("未找到相关结果");
        }

        // 5. 性能测试
        // await testPerformance(pdfVectorDB);
    } catch (error) {
        console.error("主流程错误:", error);
    }
}

// 性能测试函数
// async function testPerformance(db: any) {
//     console.log("\n开始性能测试...");

//     const testQueries = [
//         "张继科的技战术",
//         "张继科的反手",
//         "张继科的前三板",
//         "霸王拧",
//     ];

//     const times = [];

//     for (const query of testQueries) {
//         const start = Date.now();
//         await db.searchSimilarDocuments(query, 3);
//         const duration = Date.now() - start;
//         times.push(duration);
//         console.log(`查询 "${query}" 耗时: ${duration}ms`);
//         await new Promise(resolve => setTimeout(resolve, 500)); // 避免限流
//     }

//     const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
//     console.log(`\n平均查询时间: ${avgTime.toFixed(2)}ms`);
// }

// 运行向量数据库
testMilvus();

// const embeddings = new OpenAIEmbeddings({
//     model: "text-embedding-3-large"
//   });

//   const res = await embeddings.embedQuery("Hello, world!");
//   console.log(111,res);
// 创建向量存储
// const vectorStore = await MemoryVectorStore.fromDocuments(
//     // docSplits,
//     [{pageContent: text, metadata: {}}],
//     embeddings
// );



// // 创建检索工具
// const tool = createRetrieverTool(
//     retriever,
//     {
//         name: "retrieve_blog_posts",
//         description: "Search and return information about Lilian Weng blog posts on LLM agents, prompt engineering, and adversarial attacks on LLMs."
//     }
// );

// const text2 =
//     "LangGraph is a library for building stateful, multi-actor applications with LLMs";

// const vectors = await embeddings.embedDocuments([text, text2]);

// console.log(vectors[0].slice(0, 100));
// console.log(vectors[1].slice(0, 100));



// const tools = [tool];

// const GraphState = Annotation.Root({
//     messages: Annotation<BaseMessage[]>({
//         reducer: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
//         default: () => []
//     })
// })

// const toolNode = new ToolNode<typeof GraphState.State>(tools);

// // // 创建模型和使用tools
// const model = new ChatOpenAI({
//     openAIApiKey: process.env.OPENAI_API_KEY,
//     configuration: {
//         baseURL: process.env.OPENAI_BASE_URL,
//     },
//     temperature: 0,
//     modelName: 'doubao-1-5-lite-32k-250115'
// }).bindTools(tools);

// OpenAI 客户端配置
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
});

// 定义tools
// const tools = [new TavilySearchResults({ maxResults: 3 })]
// const toolNode = new ToolNode(tools)

// // 创建模型和使用tools
// const model = new ChatOpenAI({
//     openAIApiKey: process.env.OPENAI_API_KEY,
//     configuration: {
//         baseURL: process.env.OPENAI_BASE_URL,
//     },
//     temperature: 0,
//     modelName: 'doubao-1-5-lite-32k-250115'
// }).bindTools(tools);

// // OpenAI 客户端配置
// const openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
//     baseURL: process.env.OPENAI_BASE_URL,
// });

// 决定是否继续
// function shouldContinue({ messages }: typeof GraphState.State) {
//     const lastMessage = messages[messages.length - 1] as AIMessage;

//     // 如果llm进行工具调用，则将路由进入到工具节点
//     if (lastMessage.tool_calls?.length) {
//         return "tools";
//     }
//     // 否则使用__end__进行暂停
//     return END;
// }

// // 定义调用模型的函数
// async function callModel(state: typeof GraphState.State) {
//     const response = await model.invoke(state.messages);
//     return { messages: [response] };
// }

// // 定义一个graph
// const workflow = new StateGraph(GraphState)
//     .addNode("agent", callModel)
//     .addEdge("__start__", "agent")
//     .addNode("tools", toolNode)
//     .addEdge("tools", "agent")
//     .addConditionalEdges("agent", shouldContinue);

// // 编译为LangChain Runnable
// const app2 = workflow.compile();

// // 测试执行并打印结果
// async function testWorkflow() {
//     try {
//         console.log("开始测试工作流...");

//         const result = await app2.invoke({
//             messages: [new HumanMessage("请搜索关于 LLM agents 的信息")]
//         });

//         console.log("=== 执行结果 ===");
//         console.log("消息数量:", result.messages.length);

//         // 打印最后一条消息的内容
//         const lastMessage = result.messages[result.messages.length - 1];
//         console.log("最终回答:", lastMessage.content);

//         // 打印所有消息
//         console.log("\n=== 完整对话历史 ===");
//         result.messages.forEach((msg: BaseMessage, index: number) => {
//             console.log(`${index + 1}. [${msg.constructor.name}]:`, msg.content);
//         });

//     } catch (error) {
//         console.error("测试执行出错:", error);
//     }
// }

// // 调用测试函数
// if (!process.env.VERCEL) {
//     testWorkflow().catch(console.error);
// }

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

// 论文生成路由
app.post('/api/chat/paper/stream', async (req: Request, res: Response) => {
    const { message } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    try {
        await main(message, res);
    } catch (error) {
        console.error('处理请求时出错：', error);
        res.status(500).json({ error: '内部服务器错误' });
    }
});

// 服务器启动逻辑
if (!process.env.VERCEL) {
    const startServer = (port: number) => {
        const server = app.listen(port, () => {
            console.log(`服务器正在运行在 http://localhost:${port}`);
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
}

export default app; 