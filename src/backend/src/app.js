import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { Socket } from 'dgram';

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
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');  
    // 调用 main 函数并传递 message

    await main(message, res);
    
    req.on('close', () => {
        clearInterval(intervalId);
        res.end();
    })
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
        const response = await main(message);
        res.write(`data: ${JSON.stringify({ response })}\n\n`); // 发送数据
        res.flush(); // 确保数据立即发送
    } catch (err) {
        console.error('处理请求是出错：', err);
        res.status(500).json({ error: '内部服务器错误' });
    }
});


// Image input:
async function main(message) {
    try {
        const response = await openai.chat.completions.create({
            apiKey: process.env['ARK_API_KEY'],
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: `${message}` },
                        {
                            type: 'image_url',
                            image_url: {
                                url: 'https://ark-project.tos-cn-beijing.ivolces.com/images/view.jpeg',
                            },
                        },
                    ],
                },
            ],
            model: 'ep-20241210163416-fpvzh',
            stream: true
        });

        for await (const chunk of response) {
            if (chunk.choices[0].delta.content) {
                // 发送SSE消息
                res.write(`data: ${JSON.stringify({
                    content: chunk.choices[0].delta.content,
                    isLastMessage: chunk.choices[0].finish_reason === 'stop'
                })}\n\n`);
            }
            // 如果是最后一条信息
            if (chunk.choices[0].finish_reason === 'stop') {
                res.end();
            }
        }
    } catch (error) {
        console.log('处理消息时出错: ', error);
        res.write(`data: ${JSON.stringify({ error: '处理消息时出错' })}`)
        res.end();
    }
}

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器正在运行在 http://localhost:${PORT}`);
});

