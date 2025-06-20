import { Request, Response } from 'express';
import { openaiService } from '../services/openai.js';
import { StreamResponse } from '../types/index.js';
import { config } from '../config/index.js';

export class ChatController {
    async streamChat(req: Request, res: Response): Promise<void> {
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
        }, config.server.timeout);

        try {
            console.log('Stream started');
            await this.processMessage(message, res);
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
    }

    private async processMessage(message: string, res: Response): Promise<void> {
        let isEnded = false;

        try {
            const stream = await openaiService.createSimpleChatStream(message);

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
}

export const chatController = new ChatController(); 