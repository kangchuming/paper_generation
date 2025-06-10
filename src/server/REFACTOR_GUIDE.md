# Server 重构指南

## 项目结构

```
src/server/
├── app.ts                      # 原始文件 (28KB, 502行)
├── app-refactored.ts          # 重构后的主文件
├── config/
│   └── index.ts              # 配置管理
├── types/
│   └── index.ts              # TypeScript 类型定义
├── services/
│   ├── openai.ts             # OpenAI 服务
│   └── vectorDB.ts           # 向量数据库服务
├── utils/
│   └── prompts.ts            # 提示词工具
├── controllers/
│   ├── chatController.ts     # 聊天控制器
│   └── paperController.ts    # 论文生成控制器
├── middleware/
│   └── cors.ts               # CORS 中间件
└── routes/
    └── index.ts              # 路由配置
```

## 模块说明

### 1. config/index.ts
- **功能**: 统一管理所有配置参数
- **包含**: 环境变量、数据库配置、OpenAI配置、服务器配置、CORS配置
- **优势**: 集中管理，便于维护和修改

### 2. types/index.ts
- **功能**: 定义TypeScript类型和接口
- **包含**: StreamResponse、RetrievalResult、ChatRequest等
- **优势**: 类型安全，代码提示

### 3. services/
#### openai.ts
- **功能**: OpenAI API 服务封装
- **方法**: 
  - `createChatStream()`: 创建聊天流
  - `createSimpleChatStream()`: 创建简单聊天流

#### vectorDB.ts
- **功能**: 向量数据库服务封装
- **方法**: 
  - `initialize()`: 初始化数据库
  - `searchDocuments()`: 搜索文档
  - `buildRetrievalContext()`: 构建检索上下文
  - `isAvailable()`: 检查可用性

### 4. utils/prompts.ts
- **功能**: 提示词管理和构建
- **包含**: 
  - `PAPER_SYSTEM_PROMPT`: 论文系统提示词
  - `buildAcademicPrompt()`: 构建学术提示词

### 5. controllers/
#### chatController.ts
- **功能**: 处理普通聊天请求
- **方法**: 
  - `streamChat()`: 流式聊天处理
  - `processMessage()`: 消息处理逻辑

#### paperController.ts
- **功能**: 处理论文生成请求
- **方法**: 
  - `streamPaper()`: 流式论文生成
  - `generatePaperWithRetrieval()`: 带检索的论文生成

### 6. middleware/cors.ts
- **功能**: CORS中间件配置
- **优势**: 独立的跨域处理逻辑

### 7. routes/index.ts
- **功能**: 路由配置管理
- **路由**: 
  - `GET /`: 根路由
  - `POST /api/chat/stream`: 聊天流
  - `POST /api/chat/paper/stream`: 论文生成流

## 如何切换到重构版本

### 方法1: 重命名文件
```bash
# 备份原文件
mv app.ts app-original.ts

# 使用重构版本
mv app-refactored.ts app.ts
```

### 方法2: 更新 package.json
```json
{
  "scripts": {
    "start": "node app-refactored.js",
    "dev": "tsx watch app-refactored.ts"
  }
}
```

## 重构优势

### 1. 可维护性
- **模块化**: 每个模块职责单一
- **解耦**: 减少模块间依赖
- **可测试**: 各模块可独立测试

### 2. 可扩展性
- **新功能**: 轻松添加新控制器和服务
- **配置管理**: 统一的配置管理
- **中间件**: 独立的中间件系统

### 3. 代码质量
- **类型安全**: 完整的TypeScript类型定义
- **错误处理**: 统一的错误处理机制
- **代码复用**: 服务层可在多个控制器中复用

### 4. 开发体验
- **热重载**: 修改单个模块不影响其他模块
- **调试**: 更容易定位问题
- **协作**: 多人开发时减少冲突

## 迁移检查清单

- [ ] 环境变量配置正确
- [ ] 所有路由功能正常
- [ ] 向量数据库连接正常
- [ ] OpenAI API 调用正常
- [ ] CORS 配置正确
- [ ] 错误处理正常
- [ ] 日志输出正常

## 注意事项

1. **导入路径**: 使用 `.js` 扩展名（ESM要求）
2. **环境变量**: 确保 `.env` 文件路径正确
3. **依赖注入**: 服务之间的依赖关系已正确处理
4. **错误处理**: 每个模块都有适当的错误处理

## 进一步优化建议

1. **添加日志系统**: 使用 Winston 或类似库
2. **添加单元测试**: Jest 或 Vitest
3. **添加 API 文档**: Swagger/OpenAPI
4. **添加监控**: 性能和错误监控
5. **添加缓存**: Redis 缓存热门查询 