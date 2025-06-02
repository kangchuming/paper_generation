import { AlibabaTongyiEmbeddings } from "@langchain/community/embeddings/alibaba_tongyi";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MilvusClient, MetricType, IndexType } from "@zilliz/milvus2-sdk-node";
import { Document } from "@langchain/core/documents";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

interface PDFVectorDBConfig {
    collectionName: string;
    dimension: number;
    pdfDirectory: string;
    milvusAddress?: string;
    chunkSize?: number;
    chunkOverlap?: number;
}

// 配置环境变量
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

// 创建MilvusClient 
const milvusClient = new (MilvusClient as any)({
    address: 'localhost:19530',
    username: 'username',
    password: 'Aa12345!!'
});

class PDFVectorDB {
    private config: PDFVectorDBConfig;
    private embeddings: AlibabaTongyiEmbeddings;
    private milvusClient: any;
    private textSplitter: RecursiveCharacterTextSplitter;

    constructor(config: PDFVectorDBConfig) {
        this.config = {
            milvusAddress: 'localhost:19530', // 移除冒号后的空格
            chunkSize: 1000,
            chunkOverlap: 200,
            ...config
        };

        // 初始化通义嵌入模型
        this.embeddings = new AlibabaTongyiEmbeddings({
            apiKey: process.env.DASHSCOPE_API_KEY,
            modelName: 'text-embedding-v2',
        });

        // 初始化文本分割器
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: this.config.chunkSize!,
            chunkOverlap: this.config.chunkOverlap!,
        });
    }

    // 初始化milvus客户端
    async initMilvus() {
        this.milvusClient = milvusClient; // 直接使用全局实例
        console.log('Milvus客户端初始化成功');
    }

    // 创建集合
    async createCollection() {
        try {
            // 检查集合是否已经存在
            const collections = await this.milvusClient.listCollections();
            const existingCollection = collections.data?.find(
                (col: any) => col.name === this.config.collectionName
            );

            if (existingCollection) {
                console.log(`集合 ${this.config.collectionName} 已存在，正在删除以重新创建...`);
                // 先释放集合
                try {
                    await this.milvusClient.releaseCollection({
                        collection_name: this.config.collectionName
                    });
                } catch (error) {
                    console.log('释放集合时出错(可忽略):', error);
                }

                // 删除现有集合
                await this.milvusClient.dropCollection({
                    collection_name: this.config.collectionName
                });
                console.log(`集合 ${this.config.collectionName} 已删除`);
            }

            // 创建新集合
            const createResult = await this.milvusClient.createCollection({
                collection_name: this.config.collectionName,
                fields: [
                    {
                        name: 'id',
                        description: '文档片段ID',
                        data_type: 'Int64',
                        is_primary_key: true,
                        autoID: true,
                    },
                    {
                        name: 'vector',
                        description: '文本向量',
                        data_type: 'FloatVector',
                        dim: this.config.dimension,
                    },
                    {
                        name: 'text',
                        description: '原始文本内容',
                        data_type: 'VarChar',
                        max_length: 65535,
                    },
                    {
                        name: 'source',
                        description: 'PDF文件路径',
                        data_type: 'VarChar',
                        max_length: 1000,
                    },
                    {
                        name: 'page',
                        description: '页码',
                        data_type: 'Int64'
                    }
                ]
            });

            console.log('集合创建成功: ', createResult);
        } catch (error) {
            console.error('创建集合失败：', error);
            throw error;
        }
    }

    // 创建索引
    async createIndex() {
        try {
            const createIndexResult = await this.milvusClient.createIndex({
                collection_name: this.config.collectionName,
                field_name: 'vector',
                index_type: IndexType.IVF_FLAT,
                metric_type: MetricType.L2,
                params: { nlist: 1024 }
            });

            console.log('索引创建成功：', createIndexResult);
        } catch (error: any) {
            console.error('创建索引失败: ', error);
            // 如果索引已存在，继续执行
            if (!error.message?.includes('index already exist')) {
                throw error;
            } else {
                console.log('索引已存在，继续执行...');
            }
        }
    }

    // 加载PDF文档
    async loadPDFDocuments(): Promise<Document[]> {
        const pdfFiles = fs.readdirSync(this.config.pdfDirectory)
            .filter(file => file.endsWith('.pdf'))
            .map(file => path.join(this.config.pdfDirectory, file));

        console.log(`找到了 ${pdfFiles.length} 个PDF文件`);

        const allDocuments: Document[] = [];

        for (const pdfFile of pdfFiles) {
            try {
                console.log(`正在处理: ${path.basename(pdfFile)}`);

                const loader = new PDFLoader(pdfFile);
                const docs = await loader.load();

                // 为每个文档添加源文件信息
                docs.forEach((doc, index) => {
                    doc.metadata = {
                        ...doc.metadata,
                        source: pdfFile,
                        fileName: path.basename(pdfFile),
                        page: index + 1
                    };
                });

                allDocuments.push(...docs);
                console.log(`${path.basename(pdfFile)} 处理完成，共 ${docs.length} 页`);
            } catch (error) {
                console.error(`处理PDF文件 ${pdfFile} 失败:`, error);
            }
        }
        return allDocuments;
    }

    // 分割文档
    async splitDocuments(documents: Document[]): Promise<Document[]> {
        console.log('开始分割文档...');
        const splitDocs = await this.textSplitter.splitDocuments(documents);
        console.log(`文档分割完成，共生成 ${splitDocs.length} 个文档片段`);
        return splitDocs;
    }

    // 生成嵌入向量
    async generateEmbeddings(texts: string[]): Promise<number[][]> {
        console.log(`正在为 ${texts.length} 个文本片段生成嵌入向量...`);

        const batchSize = 10; // 批处理大小，避免API限制
        const embeddings: number[][] = [];

        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            console.log(`处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);

            const batchEmbeddings = await this.embeddings.embedDocuments(batch);

            // 确保向量是标准的number[]格式
            const normalizedEmbeddings = batchEmbeddings.map(embedding =>
                Array.isArray(embedding) ? embedding : Array.from(embedding)
            );
            embeddings.push(...normalizedEmbeddings);

            // 避免延迟API限制
            if (i + batchSize < texts.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log('嵌入向量生成完成');
        console.log('样本向量维度:', embeddings[0]?.length);
        console.log('样本向量类型:', typeof embeddings[0]?.[0]);

        return embeddings;
    }

    // 插入数据到Milvus
    async insertData(documents: Document[], embeddings: number[][]) {
        console.log('开始插入数据到Milvus...');

        const data = documents.map((doc, index) => ({
            vector: Array.isArray(embeddings[index])
                ? embeddings[index]
                : Array.from(embeddings[index]),
            text: doc.pageContent,
            source: doc.metadata.source || '',
            page: doc.metadata.page || 0
        }));

        const batchSize = 100; // 批量插入
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);

            try {
                const insertResult = await this.milvusClient.insert({
                    collection_name: this.config.collectionName,
                    data: batch
                });
                console.log(`批次 ${Math.floor(i / batchSize) + 1} 插入成功:`, insertResult);
            } catch (error) {
                console.error(`批次 ${Math.floor(i / batchSize) + 1} 插入失败:`, error);
                throw error;
            }
        }
        console.log('数据插入完成');
    }

    // 加载集合到内存
    async loadCollection() {
        try {
            const loadResult = await this.milvusClient.loadCollection({
                collection_name: this.config.collectionName
            });
            console.log('集合加载成功:', loadResult);
        } catch (error: any) {
            console.error('加载集合失败:', error);
            // 集合加载是必须的，如果失败就抛出错误
            throw error;
        }
    }

    // 搜索相似相似
    async searchSimilarDocuments(query: string, topK: number = 5) {
        try {
            // 生成查询向量
            const queryEmbedding = await this.embeddings.embedQuery(query);

            // 确保查询向量是标准的number[]格式
            const normalizedQueryEmbedding = Array.isArray(queryEmbedding)
                ? queryEmbedding
                : Array.from(queryEmbedding as number[]);

            console.log('查询向量维度:', normalizedQueryEmbedding.length);
            console.log('查询向量类型:', typeof normalizedQueryEmbedding[0]);

            // 搜索
            const searchResult = await this.milvusClient.search({
                collection_name: this.config.collectionName,
                data: [normalizedQueryEmbedding],
                output_fields: ['text', 'source', 'page'],
                limit: topK,
                params: {
                    index_type: IndexType.IVF_FLAT,
                    metric_type: MetricType.L2,
                    nprobe: 10
                }
            });

            console.log('搜索结果原始数据:', JSON.stringify(searchResult, null, 2));
            return searchResult;
        } catch (error) {
            console.error('搜索失败：', error);
            throw error;
        }
    }
    // 主要构建流程
    async buildVectorDB() {
        try {
            console.log('开始构建PDF向量数据库...');

            // 1. 初始化Milvus
            await this.initMilvus();

            // 2. 创建集合
            await this.createCollection();

            // 3. 加载PDF文档
            const documents = await this.loadPDFDocuments();
            if (documents.length === 0) {
                throw new Error('没有找到PDF文档');
            }

            // 4. 分割文档
            const splitDocuments = await this.splitDocuments(documents);

            // 5. 生成嵌入向量
            const texts = splitDocuments.map(doc => doc.pageContent);
            const embeddings = await this.generateEmbeddings(texts);

            // 6. 插入数据
            await this.insertData(splitDocuments, embeddings);

            // 7. 创建索引 (在插入数据前创建)
            await this.createIndex();

            // 8. 加载集合
            await this.loadCollection();
        } catch (error) {
            console.error('构建向量数据库失败:', error);
            throw error;
        }
    }
}

export default PDFVectorDB;