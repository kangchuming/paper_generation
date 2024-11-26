import { Flex, Input } from 'antd';
import './index.scss';

const { TextArea } = Input;


const Main: React.FC = () => {

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        console.log('Change:', e.target.value);
    };

    return (
        <Flex vertical gap={32}>
            <Input showCount maxLength={20} onChange={onChange} />
            <TextArea showCount maxLength={100} onChange={onChange} placeholder="can resize" />
            <TextArea
                showCount
                maxLength={100}
                onChange={onChange}
                placeholder="disable resize"
                style={{ height: 120, resize: 'none' }}
            />
        </Flex>
    )
};

export default Main;
