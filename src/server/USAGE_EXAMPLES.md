# OpenAI 服务使用示例

现在 `OpenAIService` 类提供了5种不同的调用方式，每种方式适用于不同的场景。

## 方法对比

| 方法 | 特点 | 适用场景 | 网络搜索 | 记忆功能 |
|------|------|----------|----------|----------|
| 原生OpenAI | 简单直接 | 基础聊天、向后兼容 | ❌ | ❌ |
| LangChain | 标准化接口 | 需要LangChain生态 | ❌ | ❌ |
| 工具绑定 | 自动工具调用 | 智能决策是否搜索 | ✅ | ❌ |
| Agent | 最智能 | 复杂推理、多轮对话 | ✅ | ✅ |
| 增强混合 | 灵活可控 | 可控的增强功能 | ✅ | ❌ |

## 1. 原生 OpenAI 方式

### 在控制器中使用：

```typescript
// controllers/chatController.ts
import { openaiService } from '../services/openai.js';

// 原有的使用方式保持不变
const stream = await openaiService.createChatStream([
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: message }
]);

// 简单用法
const stream = await openaiService.createSimpleChatStream(message);
```

## 2. LangChain ChatOpenAI 方式

### 标准的 LangChain 流式调用：

```typescript
// controllers/chatController.ts
import { openaiService } from '../services/openai.js';

// LangChain 方式
const stream = await openaiService.createLangChainStream([
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: message }
]);

// 处理流式响应
for await (const chunk of stream) {
    const content = chunk.content || '';
    if (content) {
        const response = { content, isLastMessage: false };
        res.write(`data: ${JSON.stringify(response)}\n\n`);
    }
}
```

## 3. 工具绑定方式 (推荐用于自动搜索)

### 让AI自动决定是否需要搜索：

```typescript
// controllers/paperController.ts 中的使用
import { openaiService } from '../services/openai.js';

async generatePaperWithAutoSearch(message: string, res: Response) {
    // AI会自动判断是否需要搜索最新信息
    const stream = await openaiService.createToolBoundSimpleStream(message);
    
    for await (const chunk of stream) {
        // 处理可能包含工具调用的响应
        if (chunk.content) {
            const response = { content: chunk.content, isLastMessage: false };
            res.write(`data: ${JSON.stringify(response)}\n\n`);
        }
        
        // 如果有工具调用，LangChain 会自动处理
        if (chunk.tool_calls) {
            console.log('AI正在使用搜索工具...');
        }
    }
}
```

## 4. Agent 方式 (最智能，推荐用于复杂对话)

### 支持多轮对话和记忆：

```typescript
// controllers/enhancedChatController.ts
import { openaiService } from '../services/openai.js';

async streamAgentChat(req: Request, res: Response) {
    const { message, threadId = "default" } = req.body;
    
    // Agent 会自动推理、搜索、记忆
    const stream = await openaiService.createAgentStream(message, threadId);
    
    for await (const chunk of stream) {
        // Agent 的响应格式可能不同
        console.log('Agent chunk:', chunk);
        
        // 提取实际内容（格式可能因版本而异）
        const content = chunk.messages?.[0]?.content || '';
        if (content) {
            const response = { content, isLastMessage: false };
            res.write(`data: ${JSON.stringify(response)}\n\n`);
        }
    }
}
```

## 5. 增强混合方式 (推荐用于可控场景)

### 结合本地检索和可选的网络搜索：

```typescript
// controllers/paperController.ts 更新
import { openaiService } from '../services/openai.js';
import { vectorDBService } from '../services/vectorDB.js';

async generatePaperWithEnhancedSearch(message: string, res: Response) {
    let searchContext = '';
    
    // 1. 本地向量检索
    if (vectorDBService.isAvailable()) {
        const searchResults = await vectorDBService.searchDocuments(message, 3);
        searchContext = vectorDBService.buildRetrievalContext(searchResults);
    }
    
    // 2. 使用增强流式聊天
    const stream = await openaiService.createEnhancedStream(message, {
        includeWebSearch: true,  // 启用网络搜索
        searchContext: searchContext,  // 传入本地检索结果
        threadId: "paper_generation"
    });
    
    for await (const chunk of stream) {
        const content = chunk.content || '';
        if (content) {
            const response = { content, isLastMessage: false };
            res.write(`data: ${JSON.stringify(response)}\n\n`);
        }
    }
}
```

## 在现有控制器中集成

### 1. 更新 chatController.ts

```typescript
// 添加新的方法选择逻辑
private async processMessage(message: string, res: Response, useWebSearch: boolean = false): Promise<void> {
    let stream;
    
    if (useWebSearch) {
        // 使用工具绑定方式，AI自动决定搜索
        stream = await openaiService.createToolBoundSimpleStream(message);
    } else {
        // 使用原有方式
        stream = await openaiService.createSimpleChatStream(message);
    }
    
    // 统一的流处理逻辑...
}
```

### 2. 更新 paperController.ts

```typescript
// 在 generatePaperWithRetrieval 中使用增强方式
private async generatePaperWithRetrieval(message: string, res: Response): Promise<void> {
    // ... 现有的向量检索逻辑 ...
    
    // 使用增强流式聊天替代原有的 OpenAI 调用
    const stream = await openaiService.createEnhancedStream(message, {
        includeWebSearch: true,
        searchContext: retrievalContext
    });
    
    // ... 流处理逻辑保持不变 ...
}
```

## 请求参数扩展

### 在请求体中添加控制参数：

```typescript
// types/index.ts 中添加
export interface EnhancedChatRequest extends ChatRequest {
    useWebSearch?: boolean;     // 是否使用网络搜索
    useAgent?: boolean;         // 是否使用Agent模式
    threadId?: string;          // 对话线程ID
    searchMode?: 'auto' | 'manual' | 'off';  // 搜索模式
}
```

### 前端调用示例：

```javascript
// 自动搜索模式
fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        message: "最新的AI发展趋势是什么？",
        useWebSearch: true
    })
});

// Agent模式（最智能）
fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        message: "帮我分析这个技术趋势",
        useAgent: true,
        threadId: "analysis_session_1"
    })
});
```

## 调试和监控

### 查看可用工具：

```typescript
console.log('可用工具:', openaiService.getAvailableTools());
// 输出: [{ name: "tavily_search_results_json", description: "..." }]
```

### 管理对话记忆：

```typescript
// 清除特定线程记忆
await openaiService.clearMemory("user_123");

// 获取对话历史
const history = await openaiService.getThreadHistory("user_123");
```

## 最佳实践建议

1. **普通聊天**: 使用原生OpenAI方式（方法1）
2. **需要搜索的问答**: 使用工具绑定方式（方法3）
3. **复杂多轮对话**: 使用Agent方式（方法4）
4. **论文生成**: 使用增强混合方式（方法5）
5. **向后兼容**: 保持原有API不变，通过参数控制新功能

选择合适的方法可以在功能性和性能之间取得最佳平衡。 