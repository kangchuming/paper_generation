// 向量数据库相关常量

// 集合名称
export const COLLECTIONS = {
    RESEARCH_PAPERS: 'research_papers',
    USER_DOCUMENTS: 'user_documents',
    CHAT_HISTORY: 'chat_history'
} as const;

// 向量维度
export const VECTOR_DIMENSIONS = {
    OPENAI_LARGE: 1536,
    OPENAI_SMALL: 512,
    SENTENCE_TRANSFORMERS: 768
} as const;

// 检索参数
export const SEARCH_PARAMS = {
    DEFAULT_LIMIT: 5,
    MAX_LIMIT: 20,
    MIN_SIMILARITY_SCORE: 0.7,
    DEFAULT_SIMILARITY_SCORE: 0.8
} as const;

// 文档分块参数
export const CHUNK_PARAMS = {
    DEFAULT_SIZE: 1500,
    MIN_SIZE: 500,
    MAX_SIZE: 4000,
    DEFAULT_OVERLAP: 200,
    MIN_OVERLAP: 50,
    MAX_OVERLAP: 500
} as const;

// Milvus 连接参数
export const MILVUS_CONFIG = {
    DEFAULT_HOST: 'localhost',
    DEFAULT_PORT: 19530,
    CONNECTION_TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 5000
} as const; 