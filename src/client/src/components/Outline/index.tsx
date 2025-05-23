import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import debounce from 'lodash/debounce';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Input, Button } from 'antd';
import { fetchPaper } from '@api/index.ts';
import { useOutlineStore } from '@store/outline';
import styles from './index.module.scss'; // 引入样式
import { b, pre, section, title, use } from 'framer-motion/client';

const { TextArea } = Input;

const prompt_paper = `您是一位在学术写作领域极具权威性的专家，尤其擅长根据论文大纲创作顶尖水平的 SCI 论文。现需您为运动科学领域创作一篇高质量的 SCI 一区论文，具体要求如下：
一、深度契合大纲
仔细研读并透彻理解所提供的论文大纲，确保生成的论文内容与大纲架构和核心主题高度契合。论文的每一部分，从章节标题到段落内容，都应紧密围绕大纲展开，不得偏离大纲所设定的研究方向与论述重点。
运用您深厚的学术功底和专业的语言表达能力，构建起一个科学、严谨且逻辑严密的论述体系。在阐述观点、分析问题和呈现研究成果时，务必保证语言的准确性和精炼性，避免出现模糊不清或表述不当的情况。无论是专业术语的运用，还是语句的组织，都要彰显学术论文的专业性。
二、权威论据支撑
广泛查阅并参考权威且前沿的学术文献，确保所引用的文献均为近五年内发表在运动科学领域核心期刊上的研究成果。这些文献将为论文提供坚实有力的论据支持，增强论文的可信度和说服力。文献的选择应涵盖经典研究以及最新的突破成果，全面展现领域内的研究动态。
在论文中适当引用文献内容时，需准确标注出处，遵循 SCI 一区期刊的引用规范。同时，在论文末尾的参考文献部分，详细列出所有引用文献的完整信息，包括作者、题目、期刊名称、发表年份、卷号、页码等，确保参考文献格式统一、准确无误，便于读者查阅追溯。
三、格式严格规范
标题：设计一个精准恰当、能够高度概括论文核心内容的标题。标题应简洁明了，控制在合理字数范围内，同时具备足够的吸引力，能够在众多学术文献中脱颖而出，激发读者的兴趣。
摘要：撰写一个全面准确的摘要，概括论文的研究目的、方法、主要结果和结论。摘要应具有独立性和自含性，让读者在不阅读全文的情况下，即可了解论文的关键信息。字数严格控制在 200 - 300 字左右，语言精炼，重点突出。
引言：创作一段引人入胜的引言，阐述研究背景、目的和意义。通过对相关领域研究现状的系统回顾，梳理已有研究成果，明确指出当前研究的不足，从而自然流畅地引出本文的研究内容与创新点。引言部分应能够吸引读者的注意力，为后文的论述做好铺垫。
正文 - 实验设计与实施：
详细阐述实验的设计思路，包括实验对象的选择标准、样本量的确定依据、分组方式等。例如，若研究某种运动训练方法对运动员体能的影响，需说明选取特定运动员群体的原因，以及如何将其分为实验组和对照组。
描述实验所采用的仪器设备及工具，精确说明其型号、规格以及在实验中的作用。如使用专业的运动监测设备，需介绍设备的品牌、功能特点以及如何确保数据采集的准确性。
分步介绍实验的具体操作流程，包括运动训练的方案、数据采集的时间节点和方式等。例如，详细描述实验组接受的特殊训练内容、频率和时长，以及对照组的常规训练安排，同时说明在实验过程中如何收集运动员的体能数据、生理指标等。
正文 - 实验结果与分析：
以清晰、直观的图表（如柱状图、折线图、散点图等）展示实验数据，图表需标注清晰的坐标轴标签、图例等信息，确保读者能够快速理解数据所表达的含义。
对实验数据进行深入分析，运用合适的统计方法（如方差分析、相关性分析等）验证研究假设，解释数据背后的科学意义。例如，通过数据分析说明实验组和对照组在体能指标上是否存在显著差异，以及这些差异与所研究的运动训练方法之间的关联。
结合已有研究成果，对实验结果进行讨论和对比，分析本研究的优势与局限性，进一步凸显研究的创新性和价值。
结论：对论文的研究成果进行深刻精炼的总结，强调研究的重要发现和贡献，明确阐述研究成果对运动科学领域理论和实践的推动作用。同时，客观、诚实地指出研究的局限性，如实验样本的局限性、研究方法的不足等，并基于此对未来该领域的研究方向提出具有前瞻性的展望与建议。结论应简洁明了，具有一定的启发性。
参考文献：按照 SCI 一区期刊的格式要求，规范详尽地列出所有引用的参考文献。参考文献的格式应统一、准确，便于读者查阅。
四、字数达标要求
论文的总字数应达到 9000 字以上，不包括参考文献部分。请合理分配各部分字数，确保论文内容丰富且重点突出。实验设计与实施、实验结果与分析等核心部分应保证充足的篇幅，以充分展示研究的科学性和严谨性。
五、性能指标
论文内容与大纲的精准性和相关性应达到 95% 以上，确保所有内容都紧密围绕大纲展开，切实回答大纲所设定的研究问题。
语言表达的流畅度和专业性需达到 90% 以上。使用规范的学术语言，避免口语化表达和语法错误，确保论文的语言质量符合 SCI 一区期刊的要求。句子结构合理，段落衔接自然，逻辑过渡顺畅。
六、沟通与优化
在开始创作前，若对大纲中的任何部分存在疑问或不明确之处，请及时向我提问，确保您完全理解大纲意图。这包括对研究问题的界定、实验设计的细节等方面的疑问。
具备根据我提供的反馈进行精准修改和完善优化的能力，能够快速响应并调整论文内容，以满足不断变化的需求。无论是内容的增减、结构的调整还是语言的润色，都要能够高效完成。
七、学术道德
始终严格遵守学术道德和相关法律规范，坚决杜绝任何抄袭或剽窃他人成果的行为。确保论文的原创性，所有观点和内容均为独立创作或基于合法引用。引用他人成果时，需按照规范进行标注，尊重知识产权。
请根据以上要求，结合所提供的论文大纲，为我创作一篇高质量的 SCI 一区论文。这篇论文对我的工作至关重要，期待您能创作出符合要求的佳作。`;

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
      await fetchPaper(`${prompt_paper} + 大纲为 + ${outline}`);
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