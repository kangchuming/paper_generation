// src/Tiptap.tsx
import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown';
// import MarkdownExtension from '@tiptap/extension-markdown'; // 导入 Markdown 扩展

import { useOutlineStore } from '@store/outline'

// define your extension array
const extensions = [
    StarterKit.configure({
        codeBlock: false,
    }), 
    Markdown.configure({
        transformPastedText: true,
        transformCopiedText: true,
        html: true,
        breaks: true,
    })
]

const Tiptap = () => {
    const paper = useOutlineStore((state) => state.paper);
    
    const editor = useEditor({
        extensions,
        content: '',
    })

    useEffect(() => {
        if (editor && paper) {
            // 将新内容追加到编辑器末尾
            editor.commands.setContent(paper);
            
            // 滚动到底部（可选）
            const element = editor.view.dom;
            element.scrollTop = element.scrollHeight;
        }
    }, [paper, editor]);

    return (
        <EditorContent editor={editor} />
    )
}

export default Tiptap