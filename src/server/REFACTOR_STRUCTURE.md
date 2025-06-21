# 项目重构结构说明

## 重构概述

原始的 `app.ts` 文件过于庞大（493行），包含了太多职责，不利于维护和扩展。本次重构将其拆分为多个模块，提高了代码的可读性、可维护性和可扩展性。

## 重构后的文件结构

```
src/server/
├── app.ts                          # 主应用文件（简化版）
├── services/                       # 服务层
│   ├── retrieverService.ts         # PDF检索服务
│   ├── paperGenerationService.ts   # 论文生成服务
│   ├── chatService.ts              # 聊天服务
│   ├── vectorDB.ts                 # 向量数据库服务
│   └── openai.ts                   # OpenAI服务
├── routes/                         # 路由层
│   ├── index.ts                    # 主路由
│   ├── chatRoutes.ts               # 聊天相关路由
│   ├── paperController.ts          # 论文控制器
│   └── chatController.ts           # 聊天控制器
├── types/                          # 类型定义
│   └── index.ts                    # 统一类型定义
├── utils/                          # 工具函数
│   └── serverUtils.ts              # 服务器工具
├── middleware/                     # 中间件
│   └── cors.js                     # CORS中间件
├── config/                         # 配置
│   └── index.js                    # 应用配置
└── controllers/                    # 控制器层
    ├── paperController.ts          # 论文控制器
    └── chatController.ts           # 聊天控制器
```

## 模块职责说明

### 1. 主应用文件 (`app.ts`)
- **职责**: 应用入口，配置中间件和路由
- **行数**: 从493行减少到约40行
- **功能**: 
  - Express应用配置
  - 中间件注册
  - 路由注册
  - 服务器启动逻辑

### 2. 服务层 (`services/`)

#### `retrieverService.ts`
- **职责**: PDF文档检索功能
- **功能**:
  - PDFRetriever类定义
  - 全局PDF向量数据库管理
  - 文档检索逻辑

#### `paperGenerationService.ts`
- **职责**: 论文生成核心逻辑
- **功能**:
  - 学术论文prompt构建
  - 论文生成流程
  - 检索结果集成
  - 流式响应处理

#### `chatService.ts`
- **职责**: 基础聊天功能
- **功能**:
  - OpenAI流式聊天
  - 消息处理逻辑

### 3. 路由层 (`routes/`)

#### `chatRoutes.ts`
- **职责**: 聊天相关API路由
- **功能**:
  - `/api/chat/stream` - 基础聊天
  - `/api/chat/paper/stream` - 论文生成

### 4. 类型定义 (`types/`)

#### `index.ts`
- **职责**: 统一类型定义
- **类型**:
  - `StreamResponse` - 流式响应类型
  - `SearchResult` - 检索结果类型
  - `RelevantDocument` - 相关文档类型
  - `RetrievalContext` - 检索上下文类型

### 5. 工具函数 (`utils/`)

#### `serverUtils.ts`
- **职责**: 服务器相关工具函数
- **功能**:
  - 服务器启动逻辑
  - Vercel环境初始化

## 重构优势

### 1. 单一职责原则
每个模块都有明确的职责，避免了功能混杂。

### 2. 可维护性提升
- 代码结构清晰，易于定位和修改
- 模块间依赖关系明确
- 便于单元测试

### 3. 可扩展性增强
- 新增功能只需在对应模块添加
- 模块间松耦合，便于独立开发

### 4. 代码复用
- 类型定义统一管理
- 工具函数可复用
- 服务层逻辑可被多个路由使用

### 5. 团队协作
- 不同开发者可以并行开发不同模块
- 减少代码冲突
- 便于代码审查

## 使用方式

重构后的代码使用方式保持不变，所有API端点路径和功能都保持一致，只是内部实现更加模块化。

## 后续优化建议

1. **添加单元测试**: 为每个服务模块添加单元测试
2. **错误处理统一**: 创建统一的错误处理中间件
3. **日志系统**: 添加结构化日志系统
4. **配置管理**: 进一步优化配置管理
5. **API文档**: 添加API文档生成 