import { Router, Request, Response } from 'express';
import { chatController } from '../controllers/chatController.js';
import { paperController } from '../controllers/paperController.js';

const router = Router();

// 根路由
router.get('/', (_req: Request, res: Response) => {
    res.json({ message: 'API is running' });
});

// // 聊天流式响应路由
// router.post('/genoutline', (req: Request, res: Response) => {
//     chatController.streamChat(req, res);
// });

// 论文生成路由
router.post('/paper/stream', (req: Request, res: Response) => {
    console.log('🚀🚀🚀 ROUTE /paper/stream HIT! 🚀🚀🚀');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    paperController.streamPaper(req, res);
});

export default router; 