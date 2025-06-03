import EnhancedPDFProcessor from './pdfProcessor.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testPDFProcessor() {
    console.log('🧪 开始测试PDF处理器...\n');
    
    const processor = new EnhancedPDFProcessor();
    
    // 假设PDF文件位于项目根目录的pdfs文件夹中
    const pdfDirectory = path.join(__dirname, '../../pdfs');
    
    try {
        console.log(`📁 测试目录: ${pdfDirectory}`);
        
        // 测试批量处理
        const documents = await processor.batchProcessPDFs(pdfDirectory);
        
        console.log('\n📊 处理结果:');
        console.log(`   ✅ 成功加载文档数: ${documents.length}`);
        
        if (documents.length > 0) {
            console.log('\n📝 样本文档信息:');
            const sampleDoc = documents[0];
            console.log(`   - 文件名: ${sampleDoc.metadata.fileName}`);
            console.log(`   - 页码: ${sampleDoc.metadata.page}`);
            console.log(`   - 内容长度: ${sampleDoc.pageContent.length} 字符`);
            console.log(`   - 内容预览: ${sampleDoc.pageContent.substring(0, 100)}...`);
        }
        
        console.log('\n✅ 测试完成！');
        
    } catch (error) {
        console.error('\n❌ 测试失败:', error);
        
        if (error instanceof Error && error.message.includes('PDF目录不存在')) {
            console.log('\n💡 提示: 请在项目根目录创建 pdfs 文件夹并放入PDF文件');
        }
    }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
    testPDFProcessor();
}

export default testPDFProcessor; 