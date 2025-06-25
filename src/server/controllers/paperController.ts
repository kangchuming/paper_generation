import { Request, Response } from 'express';
import { vectorDBService } from '../services/vectorDB.js';
import { StreamResponse } from '../types/index.js';
import { buildAcademicPrompt, PAPER_SYSTEM_PROMPT } from '../utils/prompts.js';
import { TavilySearch } from "@langchain/tavily";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";

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
            console.log('retrievalContext:', retrievalContext);
            

            // 2. 构建优化的prompt
            const enhancedPrompt = buildAcademicPrompt(message, retrievalContext);
            console.log('Enhanced prompt built:', enhancedPrompt);

            // 3. 构建StateGraph工作流
            const agentTools = [new TavilySearch({maxResults: 3})];
            const toolNode = new ToolNode(agentTools);

            // 4. 使用 LangChain ChatOpenAI 生成论文
            const chatModel = new ChatOpenAI({
                modelName: 'doubao-1-5-lite-32k-250115',
                temperature: 0.7,
                maxTokens: 8000,
                streaming: true,
                openAIApiKey: process.env.OPENAI_API_KEY,
                configuration: {
                    baseURL: process.env.OPENAI_BASE_URL,
                }
            }).bindTools(agentTools);

            // 5. 决定是否继续流程
            const shouldContinue = ({messages} : typeof MessagesAnnotation.State) => {
                 const lastMessage = messages[messages.length - 1] as any;

                 if(lastMessage.tool_calls?.length) {
                    return "tools";
                 }

                 return "__end__";
            }

            //  6. 定义调用model
            const callModel = async(state: typeof MessagesAnnotation.State) => {
                const response = await chatModel.invoke(state.messages);
                return {messages: [response]};
            }

            // 7. 定义workflow
            const workflow = new StateGraph(MessagesAnnotation)
                .addNode("agent", callModel)
                .addNode("tools", toolNode)
                .addEdge("__start__", "agent")
                .addEdge("tools", "agent")
                .addConditionalEdges("agent", shouldContinue);

            // 8. 编译workflow
            const app = workflow.compile();

            // 9. 准备初始消息
            const messages = [
                new SystemMessage(PAPER_SYSTEM_PROMPT),
                new HumanMessage(enhancedPrompt)
            ];

            // 10. 使用StateGraph执行工作流
            const stream = await app.stream({ messages }, { streamMode: "values" });

            // 11. 流式返回结果
            for await (const chunk of stream) {
                if (isEnded) break;

                // StateGraph返回的是带有messages数组的对象
                const lastMessage = chunk?.messages?.[chunk.messages.length - 1];
                const content = lastMessage?.content || '';
                
                if (content) {
                    try {
                        if (!res.writableEnded) {
                            const response: StreamResponse = {
                                content: typeof content === 'string' ? content : '',
                                isLastMessage: false
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