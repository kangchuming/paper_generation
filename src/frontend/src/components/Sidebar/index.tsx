import { useState } from 'react';
import TopicInput from '../Input';
import DragAndDropDemo from '@components/Outline';
import { Skeleton, Button } from 'antd';
import { fetchOutline } from '@api/index.ts';
import styles from './index.module.scss';


const Sidebar = () => {
    const [showInput, setShowInput] = useState(true);
    const [value, setValue] = useState('');
    const [outline, setOutline] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const prompt_outline = '你是一位专业的学术助手，精通各学科领域知识，尤其擅长将各类主题概念转化为严谨且条理清晰的学术论文大纲。现在，我会提供一段描述词，你的任务是以这段描述词为基石，严格遵循 SCI 论文的规范格式与逻辑架构，精心打造出一份涵盖引言、研究背景、研究目的、研究方法、预期结果、讨论以及结论等关键板块的详细大纲。每个部分都要充分展开，确保内容详实、层层递进，能够支撑后续完整且深入的论文撰写，使最终成文具备在国际顶尖学术期刊发表的潜力。请以最高水准的专业态度对待，不放过任何一个能提升大纲质量的细节，为后续的科研探索铺就坚实道路。'

    // 获取大纲
    const getOutline = async () => {
        try {
            const res = await fetchOutline(`${prompt_outline} + 描述词为 + ${value}`);
            setCurrentIndex(1);
            setOutline(res.response);
            console.log('res: ', res);
        }
        catch (err) {
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
                    <DragAndDropDemo value={outline} setOutline={setOutline} />
                </div>
            )}

        </div>
    )
};

export default Sidebar;

