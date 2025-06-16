import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// TypeScript 中处理 ESM 的 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置 dotenv
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 环境变量检查
if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_BASE_URL) {
    console.error('Missing required environment variables');
    process.exit(1);
}

export const config = {
    // 向量数据库配置
    vectorDB: {
        collectionName: 'research_papers',
        dimension: 1536,
        pdfDirectory: "./table_tennis_papers", // PDF存放目录
        chunkSize: 1500, // 文本块大小
        chunkOverlap: 200 //块间重叠
    },
    
    // OpenAI 配置
    openai: {
        apiKey: process.env.OPENAI_API_KEY!,
        baseURL: process.env.OPENAI_BASE_URL!,
        model: 'doubao-1-5-lite-32k-250115',
        temperature: 0.7,
        maxTokens: 8000
    },
    
    // 服务器配置
    server: {
        port: parseInt(process.env.PORT || '3000', 10),
        timeout: 30000
    },
    
    // CORS 配置
    cors: {
        allowedOrigins: [
            'https://paper-generation-client.vercel.app',
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:3000',
            'http://127.0.0.1:3000'
        ]
    }
}; 