import OpenAI from 'openai';
import { StreamResponse } from '../types/index.js';

// 主要处理函数
export async function main(message: string, res: any): Promise<void> {
    let isEnded = false;

    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL,
        });

        const stream = await openai.chat.completions.create({
            messages: [
                { role: 'user', content: message },
            ],
            model: 'doubao-1-5-lite-32k-250115',
            stream: true,
        });

        for await (const chunk of stream) {
            if (isEnded) break;

            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                try {
                    if (!res.writableEnded) {
                        const response: StreamResponse = {
                            content,
                            isLastMessage: chunk.choices[0].finish_reason === 'stop'
                        };
                        res.write(`data: ${JSON.stringify(response)}\n\n`);
                    } else {
                        isEnded = true;
                        break;
                    }
                } catch (error) {
                    console.error('写入数据时出错:', error);
                    isEnded = true;
                    break;
                }
            }
        }
    } catch (error) {
        console.error('处理消息时出错: ', error);
        if (!res.writableEnded) {
            const errorResponse: StreamResponse = { error: '处理消息时出错' };
            res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
        }
    } finally {
        if (!res.writableEnded) {
            res.end();
        }
    }
} 