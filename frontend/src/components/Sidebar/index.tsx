import { useState } from 'react';
import TopicInput from '../Input';
import styles from './index.module.scss';

const Sidebar = () => {
    return (
        <div className={styles.sidebar}>
            <TopicInput />
        </div>
    )
};

export default Sidebar;

