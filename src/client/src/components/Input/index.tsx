import { Input } from 'antd';
import styles from './index.module.scss';

const { TextArea } = Input;


const TopicInput =({value, setValue}: IInputVal) => {
  

  return (
    <>
      <TextArea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="请输入论文主题描述"
        autoSize={{ minRows: 5, maxRows: 8 }}
        showCount={true}
        allowClear={true}
        maxLength={1000}
        className={styles.input}
      />
    </>
  );
};

export default TopicInput;