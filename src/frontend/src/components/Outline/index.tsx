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
        chapters: prev.chapters.map(ch => ({...ch})).concat(newChapter)
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
    // debugger;
    // buffer.current = `() => ""# SCI论文大纲：基于张继科技战术分析的运动健康研究\n\n## 引言\n### 领域重要性\n运动健康领域对于提升人类身体素质、预防疾病和促进社会健康发展具有至关重要的意义。乒乓球作为一项全球性的体育运动，不仅具有高度的竞技性，还对参与者的身体协调性、反应速度、心肺功能等多个方面有着积极的影响。\n\n### 关键矛盾\n在当前的运动健康研究中，虽然对乒乓球运动的整体益处有一定的认识，但对于特定优秀运动员技战术背后所蕴含的运动健康价值挖掘不足。一方面，大量研究集中在乒乓球运动的普及和基础训练方面；另一方面，对于顶尖运动员独特技战术在运动健康促进中的具体机制和应用缺乏深入探讨。\n\n### 知识缺口\n目前尚未有系统的研究将张继科的技战术特点与运动健康指标进行关联分析，对于其技战术所引发的身体生理和心理变化的具体过程和影响程度存在知识空白。\n\n### 本文定位\n本文旨在填补这一知识缺口，通过对张继科技战术的深入剖析，揭示其在运动健康促进方面的潜在价值，为乒乓球运动以及其他体育运动的健康推广提供新的理论和实践依据。\n\n### 新颖性三角\n - **理论空白**：首次将张继科的技战术与运动健康理论相结合，拓展了运动健康研究的理论边界。\n - **方法创新**：采用多学科交叉的研究方法，综合运用运动学、生理学、心理学等多领域的研究手段，全面分析技战术对身体的影响。\n - **应用突破**：研究成果有望应用于乒乓球教学、健身指导等实际场景，为提高运动健康水平提供新的策略。\n\n## 研究背景\n### 支持理论\n - 运动生理学理论表明，乒乓球运动可以提高人体的心肺功能、肌肉力量和关节灵活性。\n - 运动心理学理论指出，乒乓球运动有助于提高注意力、反应能力和心理韧性。\n - 技战术分析理论为研究张继科的独特打法提供了方法和框架。\n\n### 争议领域\n - 对于乒乓球技战术与运动健康之间的具体因果关系存在不同观点，部分研究认为技战术的影响相对较小，而更多取决于运动的强度和时长。\n - 在评估技战术对身体各系统的影响程度上，不同研究得出的结论存在差异。\n\n### 空白区间\n - 缺乏对特定优秀运动员技战术在运动健康促进方面的个性化研究。\n - 对于技战术在不同年龄段、性别和运动水平人群中的应用效果缺乏深入探讨。\n\n### 技术演进路线图\n - 回顾乒乓球运动技战术的发展历程，从传统的近台快攻到现代的弧圈球结合快攻等打法的演变。\n - 标注本研究在这一技术演进过程中的时空坐标，即聚焦于张继科在当代乒乓球技战术发展中的独特地位和创新之处。\n\n### 现有方法缺陷的SWOT矩阵分析\n - **优势（S）**：现有的运动健康研究方法在数据采集和分析方面已经相对成熟，能够对身体的各项指标进行较为准确的测量。\n - **劣势（W）**：传统研究方法往往忽视了运动员个体的技战术特点，缺乏对特定技战术与运动健康之间复杂关系的深入挖掘。\n - **机会（O）**：多学科交叉研究的兴起为全面分析技战术对运动健康的影响提供了新的机遇。\n - **威胁（T）**：不同研究方法之间的兼容性和整合难度较大，可能导致研究结果的不一致性。\n\n## 研究目的\n### 理论目标\n - 构建张继科技战术与运动健康指标之间的理论模型，揭示技战术对身体生理和心理变化的作用机制。\n - 丰富和完善运动健康领域的理论体系，为后续相关研究提供新的理论基础。\n\n### 方法目标\n - 开发一套适用于分析张继科技战术对运动健康影响的综合研究方法。\n - 验证该研究方法的有效性和可靠性，为实际应用提供科学依据。\n\n### SMART原则表述\n - **Specific**：明确聚焦于张继科的技战术特点以及其对运动健康的影响。\n - **Measurable**：通过具体的生理指标（如心率、血压、肌肉力量等）和心理指标（如注意力、焦虑水平等）来衡量研究结果。\n - **Achievable**：利用现有的研究设备和技术手段，结合多学科的专业知识，确保研究目标的可实现性。\n - **Relevant**：研究结果与运动健康领域的实际需求相关，对乒乓球教学、健身指导等具有实际应用价值。\n - **Time - bound**：设定明确的研究时间节点，确保研究在规定的时间内完成。\n\n## 研究方法\n### 技术路线图\n - **基础理论**：运用运动生理学、运动心理学、技战术分析等基础理论，为研究提供理论支撑。\n - **关键技术**：采用高速摄像机、运动传感器、生理监测设备等技术手段，采集张继科技战术动作和身体生理指标数据。\n - **验证方案**：设计对照实验，将受试者分为实验组和对照组，实验组接受基于张继科技战术的训练，对照组采用传统乒乓球训练方法，对比两组在运动健康指标上的变化。\n - **分析工具**：运用统计学软件、运动分析软件等对采集的数据进行分析和处理。\n\n### 实验设计矩阵\n - **变量控制组**：实验组（基于张继科技战术训练）和对照组（传统乒乓球训练）。\n - **观测指标**：生理指标（心率、血压、肌肉力量、关节活动度等）、心理指标（注意力、反应速度、焦虑水平等）、运动技能指标（击球速度、旋转、准确性等）。\n - **数据采集方式**：在训练前后分别采集受试者的各项指标数据，采用问卷调查、现场测试等方式进行数据收集。\n\n### 创新方法需说明专利壁垒规避策略\n本研究采用的创新方法主要是多学科交叉的研究思路和综合分析方法，不涉及专利技术。在研究过程中，将遵循相关的知识产权法律法规，确保研究的合法性和合规性。\n\n## 预期结果\n### 预设多级验证体系\n - **仿真数据**：通过计算机模拟技术，对张继科技战术动作进行仿真分析，预测其对身体生理和心理指标的影响。\n - **对照实验**：通过实际的对照实验，对比实验组和对照组在运动健康指标上的差异，验证仿真数据的准确性。\n - **第三方复现**：邀请其他研究团队对本研究进行复现，进一步验证研究结果的可靠性和普遍性。\n\n### 成果展示维度\n - **定量指标**：评估基于张继科技战术的训练方法在提高心率变异性、增强肌肉力量、提高反应速度等方面的效率提升百分比。\n - **定性突破**：揭示技战术对身体运动控制机制、心理调节机制等方面的创新影响。\n - **应用场景**：探讨研究成果在乒乓球教学、青少年体育培训、康复训练等不同应用场景中的具体应用策略。\n\n## 讨论\n### 建立三层对话机制\n - **与经典理论对话**：将研究结果与运动生理学、运动心理学等经典理论进行对比分析，验证和拓展现有理论。\n - **与同类研究对话**：与其他关于乒乓球运动和运动健康的研究进行比较，分析本研究的优势和不足，为后续研究提供参考。\n - **与行业实践对话**：与乒乓球教练、健身专家等行业实践人员进行交流，探讨研究成果在实际应用中的可行性和改进方向。\n\n### 意外发现分析框架\n - **现象描述**：如果在研究过程中发现了意外的现象，如某种技战术对特定人群的特殊影响等，详细描述该现象的表现和特征。\n - **归因推理**：运用科学的方法对意外现象进行归因分析，找出可能的原因和影响因素。\n - **理论重构**：根据归因分析的结果，对现有的理论模型进行必要的重构和完善，以更好地解释和预测研究现象。\n\n## 结论\n### 成果转化双路径\n - **理论贡献**：本研究构建的张继科技战术与运动健康指标之间的理论模型，为运动健康领域的范式演进提供了新的思路和方向。\n - **实践价值**：研究成果可以应用于乒乓球教学、健身指导、康复训练等实际场景，为提高人们的运动健康水平提供具体的方法和策略。\n\n### 局限性的三维表述\n - **方法边界**：本研究采用的研究方法可能存在一定的局限性，如实验样本的选择范围有限、数据采集的精度和准确性可能受到设备和环境的影响等。\n - **数据范围**：研究数据主要集中在乒乓球运动领域，对于其他体育运动的推广和应用可能存在一定的局限性。\n - **应用场景**：研究成果在不同的应用场景中可能需要进行适当的调整和优化，以适应不同人群和环境的需求。`
    // console.log(111, buffer.current.substring(curIndexRef.current));
    buffer.current = text;
    const titlePattern = /^# /;
    const heading2Pattern = /^## /;
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
  const inputVal = useOutlineStore((state) => state.inputVal);  // 从 store 获取值
  const [showBtn, setShowBtn] = useState<boolean>(false);
  const { article, processChar } = useStreamProcessor();
  const [items, setItems] = useState<DraggableItem[]>([]);

  // 获取论文
  const genPaper = async () => {
    try {
      const outline = items.map((item) => `${item.content} + '' + ${item.description}`).join(', ');
      await fetchPaper(`${prompt_paper} + 大纲为 + ${outline}`);
    } catch (err) {
      console.log(err);
    }
  }


  // 定义 handleOnDragEnd 函数
  const handleOnDragEnd = (result) => {
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
    console.log(222, inputVal)
    if (inputVal) {
      processChar(inputVal);
    }
  }, [inputVal]
  )

  return (
    <>
      <div className="outline-container">
        <DragDropContext onDragEnd={handleOnDragEnd

        }>
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
                          }

                          } />
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
      {showBtn && (<Button className={styles.generate_article} type='primary' onClick={genPaper}>生成论文</Button>)}
    </>
  );
};

export default DragAndDropDemo;