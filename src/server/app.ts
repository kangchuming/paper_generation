import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { corsMiddleware } from './middleware/cors.js';
import { config } from './config/index.js';
import routes from './routes/index.js';
import chatRoutes from './routes/chatRoutes.js'
import { startServer, initializeVercel } from './utils/serverUtils.js';

// 环境变量配置
dotenv.config();

// 环境变量检查
if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_BASE_URL) {
    console.error('Missing required environment variables');
    process.exit(1);
}

// Express 应用配置
const app = express();

// 中间件
app.use(corsMiddleware);
app.use(bodyParser.json());

// 添加请求日志中间件
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
    console.log('Request headers:', req.headers);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Request body:', req.body);
    }
    next();
});

// 根路由
app.get('/', (_req: Request, res: Response) => {
    res.json({ message: 'API is running' });
});

// 路由配置
app.use('/api/chat/', routes);
app.use('/api/pre/', chatRoutes);

// 服务器启动逻辑
if (!process.env.VERCEL) {
    startServer(config.server.port, app);
} else {
    // Vercel环境初始化
    initializeVercel();
}

export default app; 