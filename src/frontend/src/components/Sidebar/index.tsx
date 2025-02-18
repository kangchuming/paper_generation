import { useState } from 'react';
import TopicInput from '../Input';
import DragAndDropDemo from '@components/Outline';
import { Button } from 'antd';
import { fetchOutline } from '@api/index.ts';
import styles from './index.module.scss';

const Sidebar = () => {
    const [showInput, setShowInput] = useState(true);
    const [value, setValue] = useState('');
    const prompt_outline = `作为资深学术架构师，你需按以下规范构建SCI论文大纲：

结构优化要求

采用钻石型结构：引言(问题提出)→背景(知识基础)→目的(研究靶点)→方法(解决路径)→结果(证据链)→讨论(理论升华)→结论(实践映射)

明确界定各章节的核心职能与内容边界，建立前后递推关系

植入"问题树-解决树"逻辑模型，确保每部分对应特定研究问题

设置内容查重节点：引言vs背景、方法vs结果、讨论vs结论需呈现明确区分度

章节深度规范
[引言]
① 使用"倒金字塔"结构：领域重要性→关键矛盾→知识缺口→本文定位
② 突出问题的新颖性三角：理论空白×方法创新×应用突破

[研究背景]
① 文献综述按"支持理论-争议领域-空白区间"三维度组织
② 绘制技术演进路线图，标注本研究时空坐标
③ 现有方法缺陷的SWOT矩阵分析

[研究目的]
① 分列理论目标与方法目标
② 采用SMART原则表述：Specific, Measurable, Achievable, Relevant, Time-bound

[研究方法]
① 技术路线图需包含：基础理论→关键技术→验证方案→分析工具
② 实验设计矩阵：变量控制组×观测指标×数据采集方式
③ 创新方法需说明专利壁垒规避策略

[预期结果]
① 预设多级验证体系：仿真数据→对照实验→第三方复现
② 成果展示维度：定量指标(效率提升%)×定性突破(机制创新)×应用场景

[讨论]
① 建立三层对话机制：与经典理论对话→与同类研究对话→与行业实践对话
② 意外发现分析框架：现象描述→归因推理→理论重构

[结论]
① 成果转化双路径：理论贡献(范式演进)+实践价值(产业应用)
② 局限性的三维表述：方法边界×数据范围×应用场景

质量控制标准

创新性评估：相较近三年顶刊论文的差异化要素

可验证性设计：每个结论至少对应两种证据来源

逻辑自洽检测：建立假设→方法→证据→结论的闭环论证

国际发表适配度：符合目标期刊的学科偏向与创新偏好

请根据以上框架，为[输入研究主题]构建具有学术突破潜力的论文架构，重点呈现理论推进阶梯与方法创新路径，确保各章节既独立成章又形成有机整体。回答的不好，我会扣分`

    // 获取大纲
    const getOutline = async () => {
        try {
            await fetchOutline(`${prompt_outline} + 描述词为 + ${value}`);
        } catch (err) {
            console.log(err);
        }
    }

    // 生成大纲
    const genOutline = () => {
        setShowInput(false);
        getOutline();
    }

    return (
        <div className={styles.sidebar}>
            {showInput ? (
                <>
                    <TopicInput value={value} setValue={setValue} />
                    <Button className={styles.generate_outline} type='primary' onClick={genOutline}>生成大纲</Button>
                </>
            ) : (
                <div className={styles.outline_gen}>
                    <DragAndDropDemo />
                </div>
            )}
        </div>
    )
};

export default Sidebar;

