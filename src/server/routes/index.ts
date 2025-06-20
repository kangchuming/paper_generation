import { Router, Request, Response } from 'express';
import { chatController } from '../controllers/chatController.js';
import { paperController } from '../controllers/paperController.js';

const router = Router();

// 根路由
router.get('/', (_req: Request, res: Response) => {
    res.json({ message: 'API is running' });
});

// 聊天流式响应路由
router.post('/api/chat/stream', (req: Request, res: Response) => {
    chatController.streamChat(req, res);
});

// 论文生成路由
router.post('/api/chat/paper/stream', (req: Request, res: Response) => {
    paperController.streamPaper(req, res);
});

export default router; 