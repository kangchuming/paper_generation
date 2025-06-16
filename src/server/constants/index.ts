// 通用常量定义

// API 响应状态
export const API_STATUS = {
    SUCCESS: 'success',
    ERROR: 'error',
    LOADING: 'loading',
    TIMEOUT: 'timeout'
} as const;

// HTTP 状态码
export const HTTP_STATUS = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503
} as const;

// 错误消息
export const ERROR_MESSAGES = {
    INVALID_REQUEST: '无效的请求',
    MISSING_PARAMETER: '缺少必要参数',
    INTERNAL_ERROR: '内部服务器错误',
    TIMEOUT: '请求超时',
    UNAUTHORIZED: '未授权访问',
    NOT_FOUND: '资源不存在',
    VECTOR_DB_ERROR: '向量数据库连接失败',
    OPENAI_ERROR: 'OpenAI API 调用失败'
} as const;

// 成功消息
export const SUCCESS_MESSAGES = {
    REQUEST_SUCCESS: '请求成功',
    DATA_SAVED: '数据保存成功',
    VECTOR_DB_INITIALIZED: '向量数据库初始化成功'
} as const;

// 请求超时时间 (毫秒)
export const TIMEOUT_DURATIONS = {
    DEFAULT: 30000,       // 30秒
    SHORT: 10000,         // 10秒
    MEDIUM: 60000,        // 1分钟
    LONG: 180000,         // 3分钟
    PAPER_GENERATION: 300000  // 5分钟
} as const;

// 日志级别
export const LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
} as const; 