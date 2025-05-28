declare global {
    namespace NodeJS {
        interface ProcessEnv {
            OPENAI_API_KEY: string;
            OPENAI_BASE_URL: string;
            PORT?: string;
            VERCEL?: string;
        }
    }
}

export {} 