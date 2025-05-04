import { motion } from "framer-motion";
import { MenuItem } from "./MenuItem";
// import './styles.css'

const variants = {
  open: {
    transition: { staggerChildren: 0.07, delayChildren: 0.2 }
  },
  closed: {
    transition: { staggerChildren: 0.05, staggerDirection: -1 }
  }
};

// 类型
const item: MenuItem[] = [
    {
        key: 'paper',
        label: '论文'
    },
    {
        key: 'patent',
        label: '专利'
    },
    {
        key: 'founding',
        label: '基金'
    }
]

export const Navigation = () => {
    console.log(item, item.length);
    return (
  <motion.ul variants={variants}>
    {item.map(i => (
      <MenuItem i={i.label} key={i.key} />
    ))}
  </motion.ul>
)};
