import React from 'react';
import { MailOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Menu } from 'antd';

type MenuItem = Required<MenuProps>['items'][number];

const items: MenuItem[] = [
    {
        key: 'writing',
        label: '写作',
        icon: <MailOutlined />,
        children: [
            {
                key: 'paper',
                label: '论文'
            },
            {
                key: 'patent',
                label: '专利',
            },
            {
                key: 'founding',
                label: '基金',
            },
        ],
    }
];

const MenuNavigation: React.FC = () => {
    const onClick: MenuProps['onClick'] = (e) => {
        console.log('click ', e);
    };

    return (
        <Menu
            onClick={onClick}
            style={{ width: 256 }}
            defaultSelectedKeys={['1']}
            defaultOpenKeys={['sub1']}
            mode="inline"
            items={items}
        />
    );
};

export default MenuNavigation;