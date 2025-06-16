// 搜索相关常量

// Tavily 搜索参数
export const TAVILY_CONFIG = {
    MAX_RESULTS: 10,
    DEFAULT_RESULTS: 5,
    MIN_RESULTS: 1,
    SEARCH_DEPTH: 'basic' as const, // 'basic' | 'deep'
    INCLUDE_ANSWER: true,
    INCLUDE_RAW_CONTENT: false,
    INCLUDE_DOMAINS: [] as string[],
    EXCLUDE_DOMAINS: [] as string[]
} as const;

// 搜索类型
export const SEARCH_TYPES = {
    WEB: 'web',
    NEWS: 'news',
    ACADEMIC: 'academic',
    IMAGES: 'images'
} as const;

// 搜索语言
export const SEARCH_LANGUAGES = {
    ZH: 'zh',
    EN: 'en',
    AUTO: 'auto'
} as const;

// 搜索结果处理
export const SEARCH_RESULT_CONFIG = {
    MAX_CONTENT_LENGTH: 2000,
    SUMMARY_LENGTH: 300,
    SNIPPET_LENGTH: 150
} as const; 