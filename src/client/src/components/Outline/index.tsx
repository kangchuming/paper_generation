import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import debounce from 'lodash/debounce';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Input, Button } from 'antd';
import { fetchPaper } from '@api/index.ts';
import { useOutlineStore } from '@store/outline';
import styles from './index.module.scss'; // 引入样式
import { b, pre, section, title, use } from 'framer-motion/client';

const { TextArea } = Input;

// 定义文章
interface Article {
  id: string;
  title: string;
  chapters: Chapter[];
}

// 定义章节接口
interface Chapter {
  id: string;
  title: string;
  sections: Section[];
  isComplete: boolean;
}

// 定义小节
interface Section {
  id: string;
  title: string;
  content: string;
  isComplete: boolean;
}

// 定义拖拽
interface DraggableItem {
  id: string;
  content: string;
  description: string;
  type: 'chapter' | 'section';
  level: number;
  originalIndex: number;
  chapterIndex?: number;  // 可选属性，因为章节不需要这个属性
}

// zustand接口
type State = {
  inputVal: string;
  paper: string;
  endOutlineMarker: boolean;  // 大纲终止标记
}

// DropResult 接口定义
interface DropResult {
  draggableId: string;    // 被拖拽项目的 ID
  type: string;           // 拖拽类型
  source: {               // 拖拽源位置
    index: number;        // 项目在源列表中的索引
    droppableId: string;  // 源可放置区域的 ID
  };
  destination?: {         // 拖拽目标位置（可能为 null，如拖出可放置区域）
    index: number;        // 项目在目标列表中的索引
    droppableId: string;  // 目标可放置区域的 ID
  };
  reason: 'DROP' | 'CANCEL';  // 拖拽结束的原因
}

// 用于处理流式输入的字符并构建大纲结构
const useStreamProcessor = () => {
  const buffer = useRef<string>('');
  const curIndexRef = useRef<number>(8);
  // 存储所有已完成的章节的状态
  const [article, setArticle] = useState<Article>({
    id: crypto.randomUUID(),
    title: '',
    chapters: []
  });

  // 处理完整的行的函数
  const processLine = (line: string) => {
    if (line.startsWith('# ')) {
      const title = line.slice(2);
      setArticle(prev => ({
        ...prev,
        title
      }))
    }

    else if (line.startsWith('## ')) {
      // debugger;
      const title = line.slice(3).trim();
      // 确保章节标题不为空
      if (!title) return;

      const newChapter = {
        id: crypto.randomUUID(),
        title: title,
        sections: [],
        isComplete: false
      };

      setArticle(prev => ({
        ...prev,
        chapters: prev.chapters.map(ch => ({ ...ch })).concat(newChapter)
      }));
    }

    // 处理小节标题 (以 ### 开头)
    else if (line.startsWith('### ')) {
      if (article.chapters.length <= 0) return;
      const parts = line.split('\n').filter(Boolean);
      const title = parts[0].slice(4).trim();

      if (!title) return;  // 确保标题存在

      const content = parts.slice(1).join('\n').trim();
      const newSection: Section = {
        id: crypto.randomUUID(),
        title,
        content,
        isComplete: false
      }

      setArticle(prev => {
        const chapters = prev.chapters.map(ch => ({
          ...ch,
          sections: [...ch.sections]
        }));
        const currentChapter = chapters[chapters.length - 1];
        currentChapter.sections.push(newSection);
        return { ...prev, chapters };
      })
    }
  }
  // 处理文章标题
  const processTitle = (marker: string) => {
    const start = buffer.current.indexOf('#', curIndexRef.current);
    if (start === -1) return;

    const end = buffer.current.indexOf('\n\n', start);

    if (end === -1) {
      curIndexRef.current = start;
      return;
    };

    const title = buffer.current.slice(start + marker.length, end);
    processLine(`# ${title}`);

    curIndexRef.current = end + 2;
  }

  // 修改 processHeading 函数
  const processHeading = (marker: string) => {

    // 使用严格匹配模式：换行符 + 标记 + 空格
    const start = buffer.current.indexOf(marker, curIndexRef.current);

    if (start === -1) {
      return;
    }

    const lineEnd = buffer.current.indexOf('\n', start);
    if (lineEnd === -1) {
      curIndexRef.current = start;
      return;
    };

    // 提取完整标题内容（从标记结尾到换行符）
    const titleContent = buffer.current.slice(start + marker.length, lineEnd).trim();

    // 修改原有的内容结束位置查找逻辑  
    if (marker === '### ') {
      const contentEnd = buffer.current.indexOf('\n', lineEnd + 1);
      if (contentEnd === -1) return;
      curIndexRef.current = contentEnd + 1;

      const content = buffer.current.slice(lineEnd, contentEnd).trim();
      processLine(`### ${titleContent}\n${content}`);
    } else if (marker === '## ') {
      processLine(`## ${titleContent}`);
      curIndexRef.current = lineEnd + 1;
    }
  }


  // 增强的 processChar 方法
  const processChar = (text: string) => {
    buffer.current = text;
    const titlePattern = /^# /;
    const heading2Pattern = /(?:^|\n\n?)## /;  // 匹配开头或者一个或两个换行符后的 ##
    const heading3Pattern = /(?:^|\n)### /;  // 匹配开头或换行后的 ###
    // 使用精确的匹配模式
    if (titlePattern.test(buffer.current.substring(curIndexRef.current))) {
      processTitle('# ');
    }
    else if (heading2Pattern.test(buffer.current.substring(curIndexRef.current))) {
      processHeading('## ');
    }
    else if (heading3Pattern.test(buffer.current.substring(curIndexRef.current))) {
      processHeading('### ');
    }
  }

  return {
    article,
    processChar
  }
}

const DragAndDropDemo = () => {
  const inputVal = useOutlineStore((state: State) => state.inputVal);  // 从 store 获取值
  const endOutlineMarker = useOutlineStore((state: State) => state.endOutlineMarker);
  const [showBtn, setShowBtn] = useState<boolean>(false);
  const { article, processChar } = useStreamProcessor();
  const [items, setItems] = useState<DraggableItem[]>([]);

  // 获取论文
  const genPaper = async () => {
    try {
      const outline = items.map((item) => `${item.content} + ${item.description}`).join(', ');
      await fetchPaper(`大纲为 + ${outline}`);
    } catch (err) {
      console.log(err);
    }
  }


  // 定义 handleOnDragEnd 函数
  const handleOnDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [movedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, movedItem);

    setItems(newItems);
  };

  useEffect(() => {
    // 定于转换函数
    const convertToItems = () => {
      const newItems: DraggableItem[] = [];
      article.chapters.forEach((chapter, chapterIndex) => {
        newItems.push({
          id: `chapter-${chapter.id}`,
          content: chapter.title,
          description: '',
          type: 'chapter',
          level: 1,
          originalIndex: chapterIndex
        })

        chapter.sections.forEach((section, sectionIndex) => {
          newItems.push({
            id: `section-${section.id}`,
            content: section.title,
            description: section.content,
            type: 'section',
            level: 2,
            originalIndex: sectionIndex,
            chapterIndex: chapterIndex
          })
        })
      })
      setItems(newItems);
    }
    convertToItems();
  }, [article])

  // processChar(inputVal);

  useEffect(() => {
    if (inputVal) {
      processChar(inputVal);
    }
  }, [inputVal])

  return (
    <>
      <div className="outline-container">
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <Droppable droppableId="droppable">
            {(provided) => (
              <div className={styles.outline_ul} ref={provided.innerRef} {...provided.droppableProps}>
                {items.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={styles.draggable_item}
                      >
                        <div className={styles.section_content_item_context}>
                          <TextArea rows={4} placeholder="请输入大纲标题" className={styles.section_content_item_context_title} value={item.content} onChange={(e) => {
                            const newItems = [...items];
                            newItems[index].content = e.target.value;
                            setItems(newItems);
                          }} />
                          <TextArea rows={4} placeholder="请输入大纲具体描述" className={styles.section_content_item_context_content} autoSize={true} value={item.description} onChange={(e) => {
                            const newItems = [...items];
                            newItems[index].description = e.target.value;
                            setItems(newItems)
                          }} />
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
      {endOutlineMarker && (
        <Button className={styles.generate_article} type='primary' onClick={genPaper}>生成论文</Button>)}
    </>
  );
};

export default DragAndDropDemo;