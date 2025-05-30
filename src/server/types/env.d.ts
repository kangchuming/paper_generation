declare global {
    namespace NodeJS {
        interface ProcessEnv {
            OPENAI_API_KEY: string;
            OPENAI_BASE_URL: string;
            HUGGINGFACE_API_KEY?: string;
            DASHSCOPE_API_KEY?: string;
            PORT?: string;
            VERCEL?: string;
        }
    }
}

export {} 