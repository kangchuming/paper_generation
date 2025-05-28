import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { createRetrieverTool } from "langchain/tools/retriever";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation, Annotation, END } from "@langchain/langgraph";
import { pull } from "langchain/hub";
import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ByteDanceDoubaoEmbeddings } from "@langchain/community/embeddings/bytedance_doubao";

import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';


// TypeScript 中处理 ESM 的 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置 dotenv
dotenv.config({ path: path.resolve(__dirname, '.env') });

interface StreamResponse {
    content?: string;
    error?: string;
    isLastMessage?: boolean;
}

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

// function shouldRetrieve(state: typeof GraphState.State): string {
//     const { messages } = state;
//     console.log("---DECIDE TO RETRIEVE---");
//     const lastMessage = messages[messages.length - 1];

//     if("tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length) {
//         console.log("---DECISION: RETRIEVE---");
//         return "retrieve";
//     }

//     return END;
// }

const text =
    "LangChain is the framework for building context-aware reasoning applications";

const urls = [
    "https://lilianweng.github.io/posts/2023-06-23-agent/",
    "https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/",
    "https://lilianweng.github.io/posts/2023-10-25-adv-attack-llm/",
];

const docs = await Promise.all(
    urls.map((url) => new CheerioWebBaseLoader(url).load())
)

const docsList = docs.flat();

const textsplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 100,
    chunkOverlap: 10,
})

const docSplits = await textsplitter.splitDocuments(docsList);

const embeddings = new ByteDanceDoubaoEmbeddings({
    model: "Doubao-1.5-Embedding",
    apiKey: process.env.BYTEDANCE_API_KEY || process.env.OPENAI_API_KEY,
})

const singleVector = await embeddings.embedQuery(text);

console.log(singleVector.slice(0, 100));

// 创建向量存储
// const vectorStore = await MemoryVectorStore.fromDocuments(
//     // docSplits,
//     [{pageContent: text, metadata: {}}],
//     embeddings
// );

const vectorstore = await MemoryVectorStore.fromDocuments(
    [{ pageContent: text, metadata: {} }],
    embeddings
);

const retriever = vectorstore.asRetriever(1);

const retrievedDocuments = await retriever.invoke("What is LangChain?");

retrievedDocuments[0].pageContent;

// // 创建检索工具
// const tool = createRetrieverTool(
//     retriever,
//     {
//         name: "retrieve_blog_posts",
//         description: "Search and return information about Lilian Weng blog posts on LLM agents, prompt engineering, and adversarial attacks on LLMs."
//     }
// );

const text2 =
    "LangGraph is a library for building stateful, multi-actor applications with LLMs";

const vectors = await embeddings.embedDocuments([text, text2]);

console.log(vectors[0].slice(0, 100));
console.log(vectors[1].slice(0, 100));



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