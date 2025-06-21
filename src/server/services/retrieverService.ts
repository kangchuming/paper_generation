import { BaseRetriever } from "@langchain/core/retrievers";
import { type DocumentInterface } from "@langchain/core/documents";
import PDFVectorDB from '../pdfVectordb.js';

export class PDFRetriever extends BaseRetriever {
    lc_namespace = ["pdf", "retrievers"];

    constructor(private pdfVectorDB: PDFVectorDB) {
        super();
    }

    async _getRelevantDocuments(query: string): Promise<DocumentInterface[]> {
        if(!this.pdfVectorDB) return [];

        try {
            const searchResults = await this.pdfVectorDB.searchSimilarDocuments(query, 5);

            // 解析检索结果
            const results = searchResults.results || [];

            return results.map((result: any) => ({
                pageContent: result.text || result.entity?.text || '',
                metadata: {
                    source: result.source || result.entity?.source || '',
                    page: result.page || result.entity?.page || 0,
                    score: result.score || result.distance || 0
                }
            }));
        } catch(err) {
            console.error('检索失败:', err);
            return [];
        }
    }
}

// 全局PDF向量数据库实例
export let globalPdfVectorDB: PDFVectorDB | null = null;

export const setGlobalPdfVectorDB = (pdfVectorDB: PDFVectorDB) => {
    globalPdfVectorDB = pdfVectorDB;
};

export const getGlobalPdfVectorDB = () => globalPdfVectorDB; 