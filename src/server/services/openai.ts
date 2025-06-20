import OpenAI from 'openai';
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { config } from '../config/index.js';

export class OpenAIService {
    // 1. LangChain ChatOpenAI 客户端
    private chatClient: ChatOpenAI;

    // 2. 绑定工具的客户端
    private toolBoundClient: Runnable;

    // 3. Agent 相关
    private agent: any;
    private tools: any[];
    private memory: MemorySaver;

    constructor() {
        // 1. 定义客户端
        this.chatClient = new ChatOpenAI({
            apiKey: config.openai.apiKey,
            configuration: { baseURL: config.openai.baseURL },
            modelName: config.openai.model,
            temperature: config.openai.temperature,
            maxTokens: config.openai.maxTokens,
            streaming: true
        });

        // 2. 定义联网搜索工具
        this.tools = [new TavilySearchResults({ maxResults: 5, searchDepth: 'basic' })];

        // 3. 定义memory
        this.memory = new MemorySaver();

        // 4. 绑定工具
        this.toolBoundClient = this.chatClient.bindTools(this.tools);

        this.agent = createReactAgent({
            llm: this.chatClient,
            tools: this.tools,
            checkpointer: this.memory
        });
    }

    private convertMessages(messages: any[]): BaseMessage[] {
        return messages.map(msg => {
            switch(msg.role) {
                case 'system': 
                    return new SystemMessage(msg.content);
                case 'user': 
                    return new HumanMessage(msg.content);
                case 'assistant': 
                    return new AIMessage(msg.content);
                default: 
                    return new HumanMessage(msg.content);
            }
        });
    }

    async createChatStream(messages: any[]) {
        const langchainMessages = this.convertMessages(messages);
        return this.chatClient.stream(langchainMessages);
    }

    async createSimpleChatStream(message: string) {
        return this.chatClient.stream([new HumanMessage(message)]);
    }
}

export const openaiService = new OpenAIService(); 