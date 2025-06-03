import { AlibabaTongyiEmbeddings } from "@langchain/community/embeddings/alibaba_tongyi";
import { MilvusClient } from "@zilliz/milvus2-sdk-node";
import EnhancedPDFProcessor from './pdfProcessor.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

export class VectorDBDiagnostic {
    private embeddings: AlibabaTongyiEmbeddings;
    private milvusClient: any;
    private pdfProcessor: EnhancedPDFProcessor;

    constructor() {
        // 初始化通义嵌入模型
        this.embeddings = new AlibabaTongyiEmbeddings({
            apiKey: process.env.DASHSCOPE_API_KEY,
            modelName: 'text-embedding-v2',
        });

        // 初始化Milvus客户端
        this.milvusClient = new (MilvusClient as any)({
            address: 'localhost:19530',
            username: 'username',
            password: 'Aa12345!!'
        });

        // 初始化PDF处理器
        this.pdfProcessor = new EnhancedPDFProcessor();
    }

    /**
     * 步骤1: 检测嵌入模型的实际维度
     */
    async detectEmbeddingDimension(): Promise<number> {
        try {
            console.log('🔍 检测嵌入模型维度...');
            const testText = "这是一个测试文本";
            const embedding = await this.embeddings.embedQuery(testText);
            
            const normalizedEmbedding = Array.isArray(embedding) ? embedding : Array.from(embedding as any);
            const dimension = normalizedEmbedding.length;
            
            console.log(`✅ 检测到嵌入向量维度: ${dimension}`);
            console.log(`📊 向量类型: ${typeof normalizedEmbedding[0]}`);
            console.log(`📈 样本向量前5个值: [${normalizedEmbedding.slice(0, 5).join(', ')}]`);
            
            return dimension;
        } catch (error) {
            console.error('❌ 嵌入模型维度检测失败:', error);
            throw error;
        }
    }

    /**
     * 步骤2: 检查Milvus连接
     */
    async checkMilvusConnection(): Promise<boolean> {
        try {
            console.log('🔗 检查Milvus连接...');
            const health = await this.milvusClient.checkHealth();
            console.log('✅ Milvus连接正常:', health);
            return true;
        } catch (error) {
            console.error('❌ Milvus连接失败:', error);
            return false;
        }
    }

    /**
     * 步骤3: 列出现有集合
     */
    async listCollections(): Promise<void> {
        try {
            console.log('📋 列出现有集合...');
            const collections = await this.milvusClient.listCollections();
            console.log('现有集合:', collections);
        } catch (error) {
            console.error('❌ 列出集合失败:', error);
        }
    }

    /**
     * 步骤4: 删除有问题的集合
     */
    async cleanupCollection(collectionName: string): Promise<void> {
        try {
            console.log(`🧹 清理集合: ${collectionName}`);
            
            // 先尝试释放集合
            try {
                await this.milvusClient.releaseCollection({
                    collection_name: collectionName
                });
                console.log(`✅ 集合 ${collectionName} 已释放`);
            } catch (error) {
                console.log(`ℹ️  集合释放失败(可能未加载):`, error);
            }

            // 删除集合
            try {
                await this.milvusClient.dropCollection({
                    collection_name: collectionName
                });
                console.log(`✅ 集合 ${collectionName} 已删除`);
            } catch (error) {
                console.log(`ℹ️  集合删除失败(可能不存在):`, error);
            }
        } catch (error) {
            console.error(`❌ 清理集合失败:`, error);
        }
    }

    /**
     * 步骤5: 使用正确维度创建集合
     */
    async createCollectionWithCorrectDimension(collectionName: string, dimension: number): Promise<void> {
        try {
            console.log(`🏗️  创建集合: ${collectionName}，维度: ${dimension}`);
            
            const createResult = await this.milvusClient.createCollection({
                collection_name: collectionName,
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
                        dim: dimension,
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

            console.log('✅ 集合创建成功:', createResult);
        } catch (error) {
            console.error('❌ 集合创建失败:', error);
            throw error;
        }
    }

    /**
     * 步骤6: 创建索引
     */
    async createIndex(collectionName: string): Promise<void> {
        try {
            console.log(`📊 为集合 ${collectionName} 创建索引...`);
            
            const createIndexResult = await this.milvusClient.createIndex({
                collection_name: collectionName,
                field_name: 'vector',
                index_name: 'vector_index',
                index_type: "HNSW",
                metric_type: "L2",
                params: { efConstruction: 10, M: 4 }
            });

            console.log('✅ 索引创建成功:', createIndexResult);
        } catch (error: any) {
            if (error.message?.includes('index already exist')) {
                console.log('ℹ️  索引已存在，跳过创建');
            } else {
                console.error('❌ 索引创建失败:', error);
                throw error;
            }
        }
    }

    /**
     * 步骤7: 测试小批量数据插入
     */
    async testDataInsertion(collectionName: string, pdfDirectory: string): Promise<void> {
        try {
            console.log('🧪 测试数据插入...');
            
            // 加载少量PDF文档进行测试
            console.log('📄 加载测试PDF文档...');
            const documents = await this.pdfProcessor.batchProcessPDFs(pdfDirectory);
            
            if (documents.length === 0) {
                console.warn('⚠️  没有找到PDF文档');
                return;
            }

            // 只取前3个文档进行测试
            const testDocs = documents.slice(0, 3);
            console.log(`📝 使用 ${testDocs.length} 个文档进行测试`);

            // 生成嵌入向量
            const texts = testDocs.map(doc => doc.pageContent);
            console.log('🔄 生成嵌入向量...');
            const embeddings = await this.embeddings.embedDocuments(texts);

            // 标准化向量
            const normalizedEmbeddings = embeddings.map(embedding => {
                if (Array.isArray(embedding)) {
                    return embedding.map(val => Number(val));
                } else {
                    return Array.from(embedding as any).map(val => Number(val));
                }
            });

            console.log(`📊 向量信息:`);
            console.log(`   文档数量: ${testDocs.length}`);
            console.log(`   向量数量: ${normalizedEmbeddings.length}`);
            console.log(`   向量维度: ${normalizedEmbeddings[0]?.length}`);

            // 准备插入数据
            const insertData = testDocs.map((doc, index) => ({
                vector: normalizedEmbeddings[index],
                text: doc.pageContent,
                source: doc.metadata.source || '',
                page: doc.metadata.page || 0
            }));

            // 执行插入
            console.log('💾 插入测试数据...');
            const insertResult = await this.milvusClient.insert({
                collection_name: collectionName,
                data: insertData
            });

            console.log('✅ 测试数据插入成功:', insertResult);

            // 加载集合
            console.log('📂 加载集合到内存...');
            await this.milvusClient.loadCollectionSync({
                collection_name: collectionName
            });
            console.log('✅ 集合加载完成');

        } catch (error) {
            console.error('❌ 测试数据插入失败:', error);
            throw error;
        }
    }

    /**
     * 步骤8: 测试搜索功能
     */
    async testSearch(collectionName: string): Promise<void> {
        try {
            console.log('🔍 测试搜索功能...');
            
            const query = '测试查询';
            const queryEmbedding = await this.embeddings.embedQuery(query);
            const normalizedQueryEmbedding = Array.isArray(queryEmbedding) 
                ? queryEmbedding.map(val => Number(val))
                : Array.from(queryEmbedding as any).map(val => Number(val));

            console.log(`🎯 查询向量维度: ${normalizedQueryEmbedding.length}`);

            const searchResult = await this.milvusClient.search({
                collection_name: collectionName,
                data: [normalizedQueryEmbedding],
                output_fields: ['text', 'source', 'page'],
                limit: 3,
                params: {
                    index_type: "HNSW",
                    metric_type: "L2",
                }
            });

            console.log('✅ 搜索测试成功:', searchResult);
        } catch (error) {
            console.error('❌ 搜索测试失败:', error);
            throw error;
        }
    }

    /**
     * 完整诊断流程
     */
    async fullDiagnostic(collectionName: string, pdfDirectory: string): Promise<void> {
        console.log('🚀 开始向量数据库完整诊断...\n');

        try {
            // 1. 检测嵌入维度
            const dimension = await this.detectEmbeddingDimension();
            console.log('');

            // 2. 检查Milvus连接
            const isConnected = await this.checkMilvusConnection();
            if (!isConnected) {
                throw new Error('Milvus连接失败');
            }
            console.log('');

            // 3. 列出现有集合
            await this.listCollections();
            console.log('');

            // 4. 清理旧集合
            await this.cleanupCollection(collectionName);
            console.log('');

            // 5. 创建新集合
            await this.createCollectionWithCorrectDimension(collectionName, dimension);
            console.log('');

            // 6. 创建索引
            await this.createIndex(collectionName);
            console.log('');

            // 7. 测试数据插入
            await this.testDataInsertion(collectionName, pdfDirectory);
            console.log('');

            // 8. 测试搜索
            await this.testSearch(collectionName);
            console.log('');

            console.log('🎉 向量数据库诊断完成！所有测试通过。');
            console.log(`✅ 您现在可以使用维度为 ${dimension} 的配置正常运行向量数据库了。`);

        } catch (error) {
            console.error('❌ 诊断过程中出现错误:', error);
            throw error;
        }
    }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
    const diagnostic = new VectorDBDiagnostic();
    const collectionName = 'test_papers';
    const pdfDirectory = path.join(__dirname, '../../pdfs');
    
    diagnostic.fullDiagnostic(collectionName, pdfDirectory)
        .then(() => {
            console.log('\n🎯 诊断完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 诊断失败:', error);
            process.exit(1);
        });
}

export default VectorDBDiagnostic; 