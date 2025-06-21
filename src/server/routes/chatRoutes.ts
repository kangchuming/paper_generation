import { Router, Request, Response } from 'express';
import { main } from '../services/chatService.js';
import { generatePaperWithRetrieval } from '../services/paperGenerationService.js';
import { StreamResponse } from '../types/index.js';

const router = Router();

// 聊天流式响应路由
router.post('/stream', async (req: Request, res: Response) => {
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
router.post('/paper/stream', async (req: Request, res: Response) => {
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

export default router; 