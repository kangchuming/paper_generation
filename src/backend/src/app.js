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
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// 添加一些调试日志
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY);
console.log('OPENAI_BASE_URL:', process.env.OPENAI_BASE_URL);
const app = express();
const PORT = 3000;

//中间件
app.use(cors());
app.use(bodyParser.json());

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
    res.setHeader('Access-Control-Allow-Origin', '*');

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

// 定义处理 POST 请求的路由
app.post('/api/chat/paper/stream', async (req, res) => {
    const { message } = req.body;

    // 设置响应头以支持 SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 调用 main 函数并传递 message
    try {
        const response = await main(message, res);
        res.write(`data: ${JSON.stringify({ response })}\n\n`); // 发送数据
        // res.flush(); // 确保数据立即发送
    } catch (error) {
        console.error('处理请求是出错：', err);
        res.status(500).json({ error: '内部服务器错误' });
    }
});


// Image input:
async function main(message, res) {
    try {
        const stream = await openai.chat.completions.create({
            messages: [
                { role: 'user', content: message },
            ],
            model: 'ep-20250207153327-wrffm',
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

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器正在运行在 http://localhost:${PORT}`);
});

