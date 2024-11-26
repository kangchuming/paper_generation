import { useState } from 'react';
import { Input } from 'antd';

const { TextArea } = Input;

const TopicInput =() => {
  const [value, setValue] = useState('');

  return (
    <>
      <TextArea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="请输入论文主题描述"
        autoSize={{ minRows: 3, maxRows: 5 }}
      />
    </>
  );
};

export default TopicInput;