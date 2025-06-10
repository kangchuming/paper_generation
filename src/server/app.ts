import express from 'express';
import bodyParser from 'body-parser';
import { config } from './config/index.js';
import { corsMiddleware } from './middleware/cors.js';
import { vectorDBService } from './services/vectorDB.js';
import routes from './routes/index.js';

// Express 应用配置
const app = express();

// 中间件
app.use(corsMiddleware);
app.use(bodyParser.json());

// 路由
app.use('/', routes);

// 服务器启动逻辑
if (!process.env.VERCEL) {
    const startServer = (port: number) => {
        const server = app.listen(port, async () => {
            console.log(`服务器正在运行在 http://localhost:${port}`);
            
            // 初始化向量数据库
            console.log('正在初始化向量数据库...');
            try {
                await vectorDBService.initialize();
                console.log('✅ 向量数据库初始化完成');
            } catch (error) {
                console.error('❌ 向量数据库初始化失败:', error);
                console.log('⚠️  应用将在没有检索功能的情况下运行');
            }
        }).on('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`端口 ${port} 已被占用，尝试使用端口 ${port + 1}`);
                startServer(port + 1);
            } else {
                console.error('启动服务器时出错:', err);
            }
        });
    };

    startServer(config.server.port);
} else {
    // 在Vercel环境中也要初始化向量数据库
    vectorDBService.initialize().catch((error) => {
        console.error('Vercel环境向量数据库初始化失败:', error);
    });
}

export default app; 