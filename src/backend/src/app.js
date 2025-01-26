import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// 配置 dotenv，这行必须在使用任何环境变量之前
dotenv.config();

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
    // 调用 main 函数并传递 message

    const intervalId = setInterval(async () => {
        const result = await main(message);
        res.write(`event: QuoteEvent\n`);
        res.write(`data: {message: "${result}"}\n\n`);

        if (result.includes('Stream Ended')) {
            clearInterval(intervalId);
            res.write(`event: Close\n`);
            res.write(`data: {"message": "Stream Ended"}\n\n`);
            res.end(); // Ensure the response is closed
        }
    }, 100);
    // try {

    //     res.json({ response });
    // } catch (err) {
    //     console.error('处理请求是出错：', err);
    //     res.status(500).json({ error: '内部服务器错误' });
    // }
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
    });
    return response.choices[0].message.content; // 确保返回内容
}

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器正在运行在 http://localhost:${PORT}`);
});

