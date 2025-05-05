import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置 dotenv，这行必须在使用任何环境变量之前
dotenv.config({ path: path.resolve(__dirname, '.env') });

// 添加一些调试日志
const app = express();
const PORT = 3000;

// CORS 配置
const allowedOrigins = [
    'https://paper-generation-client.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
];

const corsOptions = {
    origin: function (origin, callback) {
        // 允许没有origin的请求（比如移动端app）
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

//中间件
app.use(cors(corsOptions));
app.use(bodyParser.json());

// 添加根路由处理
app.get('/', (req, res) => {
    res.json({ message: 'API is running' });
});

// 确保环境变量存在
if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_BASE_URL) {
    console.error('Missing required environment variables');
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
});

// 定义处理 POST 请求的路由
app.post('/api/chat/stream', async (req, res) => {
    const { message } = req.body;
    // 设置响应头以支持 SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    try {
        // 移除不必要的 response 写入，直接调用 main
        console.log('Stream started');
        await main(message, res);
    } catch (error) {
        console.error('处理请求出错：', error);
        res.write(`data: ${JSON.stringify({ error: '内部服务器错误' })}\n\n`);
        res.end();
    } finally {
        console.log('Stream ended');
    }

    req.on('close', () => {
        res.end();
    });
});

// Image input:
async function main(message, res) {
    try {
        const stream = await openai.chat.completions.create({
            messages: [
                { role: 'user', content: message },
            ],
            model: 'doubao-1-5-lite-32k-250115',
            stream: true,
        });
        
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                res.write(`data: ${JSON.stringify({ content: content, isLastMessage: chunk.choices[0].finish_reason === 'stop' })}\n\n`);
            }
        }
        res.end();
    } catch (error) {
        console.error('处理消息时出错: ', error);
        res.write(`data: ${JSON.stringify({ error: '处理消息时出错' })}\n\n`);
        res.end();
    }
}

// 如果不在Vercel环境中，启动本地服务器
if (!process.env.VERCEL) {
    // 定义一个尝试绑定端口的函数
    const startServer = (port) => {
      const server = app.listen(port, () => {
        console.log(`服务器正在运行在 http://localhost:${port}`);
      }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`端口 ${port} 已被占用，尝试使用端口 ${port + 1}`);
          startServer(port + 1);
        } else {
          console.error('启动服务器时出错:', err);
        }
      });
    };
  
    // 从环境变量获取初始端口或使用默认值3000
    const initialPort = parseInt(process.env.PORT, 10) || 3000;
    startServer(initialPort);
}
  
// 使用ES模块导出语法
export default app;