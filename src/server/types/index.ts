export interface StreamResponse {
    content?: string;
    error?: string;
    isLastMessage?: boolean;
}

export interface RetrievalResult {
    index: number;
    content: string;
    source: string;
    page: number;
    relevanceScore: number;
}

export interface ChatRequest {
    message: string;
}

export interface SearchResult {
    text?: string;
    source?: string;
    page?: number;
    score?: number;
    entity?: {
        text?: string;
        source?: string;
        page?: number;
    };
    distance?: number;
}

// Tavily 搜索相关类型
export interface TavilySearchRequest {
    query: string;
    maxResults?: number;
    includeAnswer?: boolean;
    includeRawContent?: boolean;
    searchDepth?: 'basic' | 'deep';
    includeDomains?: string[];
    excludeDomains?: string[];
}

export interface TavilySearchResult {
    title: string;
    url: string;
    content: string;
    score: number;
    publishedDate?: string;
}

export interface TavilyResponse {
    query: string;
    answer?: string;
    results: TavilySearchResult[];
    responseTime: number;
}

export interface EnhancedChatRequest extends ChatRequest {
    includeWebSearch?: boolean;
    searchQuery?: string;
    maxSearchResults?: number;
} 