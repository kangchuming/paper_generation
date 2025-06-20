import { Request, Response } from 'express';
import { openaiService } from '../services/openai.js';
import { vectorDBService } from '../services/vectorDB.js';
import { StreamResponse } from '../types/index.js';
import { buildAcademicPrompt, PAPER_SYSTEM_PROMPT } from '../utils/prompts.js';

export class PaperController {
    async streamPaper(req: Request, res: Response): Promise<void> {
        const { message } = req.body;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');

        try {
            await this.generatePaperWithRetrieval(message, res);
        } catch (error) {
            console.error('处理请求时出错：', error);
            res.status(500).json({ error: '内部服务器错误' });
        }
    }

    private async generatePaperWithRetrieval(message: string, res: Response): Promise<void> {
        let isEnded = false;
        let retrievalContext = '';

        try {
            // 1. 首先进行文档检索
            if (vectorDBService.isAvailable()) {
                const searchResults = await vectorDBService.searchDocuments(message, 5);
                retrievalContext = vectorDBService.buildRetrievalContext(searchResults);
            }

            // 2. 构建优化的prompt
            const enhancedPrompt = buildAcademicPrompt(message, retrievalContext);
            console.log('Enhanced prompt built:', enhancedPrompt.substring(0, 200) + '...');

            // 3. 调用大模型生成论文
            const stream = await openaiService.createChatStream([
                {
                    role: 'system',
                    content: PAPER_SYSTEM_PROMPT
                },
                {
                    role: 'user',
                    content: enhancedPrompt
                }
            ]);

            // 4. 流式返回结果
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
            console.error('生成论文时出错: ', error);
            if (!res.writableEnded) {
                const errorResponse: StreamResponse = { error: '生成论文时出错，请重试' };
                res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
            }
        } finally {
            if (!res.writableEnded) {
                res.end();
            }
        }
    }
}

export const paperController = new PaperController(); 