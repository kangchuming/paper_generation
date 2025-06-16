import PDFVectorDB from '../utils/pdfVectordb.js';
import { config } from '../config/index.js';
import path from 'path';
import { RetrievalResult, SearchResult } from '../types/index.js';

export class VectorDBService {
    private vectorDB: PDFVectorDB | null = null;

    async initialize(): Promise<void> {
        try {
            console.log('正在初始化向量数据库...');
            this.vectorDB = new PDFVectorDB(config.vectorDB);

            // 初始化Milvus连接
            await this.vectorDB.initMilvus();

            // 检查集合是否存在，如果不存在则构建向量数据库
            try {
                // 尝试执行一个简单的搜索来验证向量数据库是否已构建
                await this.vectorDB.searchSimilarDocuments('测试', 1);
                console.log('✅ 向量数据库已存在且可用');
            } catch (error) {
                console.log('向量数据库不存在或不完整，开始构建...');
                await this.vectorDB.buildVectorDB();
                console.log('✅ 向量数据库构建完成');
            }

            console.log('向量数据库初始化完成');
        } catch (error) {
            console.error('向量数据库初始化失败:', error);
            // 不抛出错误，允许应用继续运行，但检索功能会不可用
            this.vectorDB = null;
            throw error;
        }
    }

    async searchDocuments(query: string, limit: number = 5): Promise<RetrievalResult[]> {
        if (!this.vectorDB) {
            console.log('向量数据库未初始化');
            return [];
        }

        try {
            console.log('正在检索相关文档...');
            const searchResults = await this.vectorDB.searchSimilarDocuments(query, limit);
            
            // 解析检索结果
            const results = searchResults.results || [];
            if (results.length === 0) {
                console.log('未检索到相关文档');
                return [];
            }

            const relevantDocs = results.map((result: SearchResult, index: number) => {
                const text = result.text || result.entity?.text || '';
                const source = result.source || result.entity?.source || '';
                const page = result.page || result.entity?.page || 0;
                const score = result.score || result.distance || 0;

                return {
                    index: index + 1,
                    content: text.trim(),
                    source: source,
                    page: page,
                    relevanceScore: score
                };
            });

            console.log(`检索到 ${relevantDocs.length} 个相关文档片段`);
            return relevantDocs;
        } catch (error) {
            console.error('文档检索失败:', error);
            return [];
        }
    }

    buildRetrievalContext(docs: RetrievalResult[]): string {
        if (docs.length === 0) return '';
        
        return docs.map((doc) =>
            `[文档${doc.index}] 来源: ${path.basename(doc.source)} (第${doc.page}页)\n内容: ${doc.content}`
        ).join('\n\n');
    }

    isAvailable(): boolean {
        return this.vectorDB !== null;
    }
}

export const vectorDBService = new VectorDBService(); 