import TopicInput from '../Input';
import { Button } from 'antd';
import styles from './index.module.scss';


const Sidebar = () => {
    return (
        <div className={styles.sidebar}>
            <TopicInput />
            <Button className={styles.generate_article} type='primary'>生成论文</Button>
        </div>
    )
};

export default Sidebar;

