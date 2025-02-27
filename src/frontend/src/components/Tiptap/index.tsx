// src/Tiptap.tsx
import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown';
import { useOutlineStore } from '@store/outline'

// zustand接口
type State = {
    inputVal: string;
    paper: string;
    endOutlineMarker: boolean;  // 大纲终止标记
  }

  
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
    const paper = useOutlineStore((state: State) => state.paper);
    
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