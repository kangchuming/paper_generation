import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents";
import fs from 'fs';
import path from 'path';

export class EnhancedPDFProcessor {
    private suppressedWarnings: string[] = [
        'Unknown type 1 charstring command',
        'Invalid PDF',
        'font',
        'glyph',
        'encoding',
        'charstring'
    ];

    /**
     * 抑制PDF解析过程中的特定警告
     */
    private suppressPDFWarnings(): () => void {
        const originalConsoleWarn = console.warn;
        const originalConsoleError = console.error;
        
        console.warn = (message: any, ...args: any[]) => {
            const messageStr = String(message);
            if (this.suppressedWarnings.some(warning => 
                messageStr.toLowerCase().includes(warning.toLowerCase()))) {
                return;
            }
            originalConsoleWarn(message, ...args);
        };

        console.error = (message: any, ...args: any[]) => {
            const messageStr = String(message);
            if (this.suppressedWarnings.some(warning => 
                messageStr.toLowerCase().includes(warning.toLowerCase()))) {
                return;
            }
            originalConsoleError(message, ...args);
        };

        // 返回恢复函数
        return () => {
            console.warn = originalConsoleWarn;
            console.error = originalConsoleError;
        };
    }

    /**
     * 使用多种策略加载PDF文件
     */
    async loadPDFWithFallback(filePath: string): Promise<Document[]> {
        const strategies = [
            // 策略1: 标准加载
            async () => {
                const loader = new PDFLoader(filePath, {
                    splitPages: true
                });
                return await loader.load();
            },
            
            // 策略2: 宽松解析
            async () => {
                const loader = new PDFLoader(filePath, {
                    splitPages: true,
                    parsedItemSeparator: '\n'
                });
                return await loader.load();
            },
            
            // 策略3: 简化加载
            async () => {
                const loader = new PDFLoader(filePath);
                return await loader.load();
            }
        ];

        const restoreConsole = this.suppressPDFWarnings();
        
        try {
            for (let i = 0; i < strategies.length; i++) {
                try {
                    console.log(`尝试策略 ${i + 1} 加载PDF: ${path.basename(filePath)}`);
                    const docs = await strategies[i]();
                    
                    if (docs && docs.length > 0) {
                        console.log(`策略 ${i + 1} 成功，加载了 ${docs.length} 页`);
                        return docs;
                    }
                } catch (error) {
                    console.log(`策略 ${i + 1} 失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    if (i === strategies.length - 1) {
                        throw error;
                    }
                }
            }
            
            throw new Error('所有加载策略都失败了');
        } finally {
            restoreConsole();
        }
    }

    /**
     * 批量处理PDF文件
     */
    async batchProcessPDFs(pdfDirectory: string): Promise<Document[]> {
        if (!fs.existsSync(pdfDirectory)) {
            throw new Error(`PDF目录不存在: ${pdfDirectory}`);
        }

        const pdfFiles = fs.readdirSync(pdfDirectory)
            .filter(file => file.toLowerCase().endsWith('.pdf'))
            .map(file => path.join(pdfDirectory, file));

        console.log(`发现 ${pdfFiles.length} 个PDF文件`);

        const allDocuments: Document[] = [];
        const failedFiles: string[] = [];

        for (const pdfFile of pdfFiles) {
            try {
                console.log(`\n处理文件: ${path.basename(pdfFile)}`);
                
                const docs = await this.loadPDFWithFallback(pdfFile);
                
                // 添加元数据
                docs.forEach((doc, index) => {
                    doc.metadata = {
                        ...doc.metadata,
                        source: pdfFile,
                        fileName: path.basename(pdfFile),
                        page: index + 1,
                        processedAt: new Date().toISOString()
                    };
                });

                allDocuments.push(...docs);
                console.log(`✅ ${path.basename(pdfFile)} 处理完成`);
                
            } catch (error) {
                console.error(`❌ 处理PDF文件失败: ${path.basename(pdfFile)}`);
                console.error(`   错误详情: ${error instanceof Error ? error.message : 'Unknown error'}`);
                failedFiles.push(pdfFile);
            }
        }

        // 输出处理结果统计
        console.log(`\n📊 PDF处理结果统计:`);
        console.log(`   成功处理: ${pdfFiles.length - failedFiles.length} 个文件`);
        console.log(`   处理失败: ${failedFiles.length} 个文件`);
        console.log(`   总文档数: ${allDocuments.length} 页`);

        if (failedFiles.length > 0) {
            console.log(`   失败文件列表:`);
            failedFiles.forEach(file => console.log(`     - ${path.basename(file)}`));
        }

        return allDocuments;
    }

    /**
     * 验证PDF文件是否可读
     */
    async validatePDF(filePath: string): Promise<boolean> {
        try {
            await this.loadPDFWithFallback(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }
}

export default EnhancedPDFProcessor; 