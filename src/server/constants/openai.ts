// OpenAI 相关常量

// 模型名称
export const OPENAI_MODELS = {
    GPT_4: 'gpt-4',
    GPT_4_TURBO: 'gpt-4-turbo',
    GPT_3_5_TURBO: 'gpt-3.5-turbo',
    DOUBAO_LITE: 'doubao-1-5-lite-32k-250115',
    TEXT_EMBEDDING_3_LARGE: 'text-embedding-3-large',
    TEXT_EMBEDDING_3_SMALL: 'text-embedding-3-small'
} as const;

// 角色类型
export const OPENAI_ROLES = {
    SYSTEM: 'system',
    USER: 'user',
    ASSISTANT: 'assistant',
    FUNCTION: 'function'
} as const;

// 生成参数范围
export const GENERATION_PARAMS = {
    TEMPERATURE: {
        MIN: 0,
        MAX: 2,
        DEFAULT: 0.7,
        CREATIVE: 1.2,
        CONSERVATIVE: 0.3
    },
    MAX_TOKENS: {
        SHORT: 1000,
        MEDIUM: 4000,
        LONG: 8000,
        EXTRA_LONG: 16000
    },
    TOP_P: {
        MIN: 0,
        MAX: 1,
        DEFAULT: 1
    }
} as const;

// 特殊标记
export const OPENAI_SPECIAL_TOKENS = {
    STOP: '<|im_end|>',
    START: '<|im_start|>',
    SYSTEM_START: '<|im_start|>system',
    USER_START: '<|im_start|>user',
    ASSISTANT_START: '<|im_start|>assistant'
} as const; 