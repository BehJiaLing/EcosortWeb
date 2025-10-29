import React from "react";
import './Sidebar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTachometerAlt,
    faRecycle,
    faUserShield,
    faTrophy,
    faUser,
    faWebAwesome,
    faAward,
    faHistory
} from '@fortawesome/free-solid-svg-icons';

const Sidebar = ({ isCollapsed, onMenuClick, activeMenu, allowedPages }) => {
    const menuItems = [
        { name: "Dashboard", icon: faTachometerAlt },
        { name: "Waste Logs", icon: faRecycle },
        { name: "Waste Audit", icon: faHistory },
        { name: "Access Management", icon: faUserShield },
        { name: "Award Activity", icon: faTrophy },
        { name: "Redeem Award", icon: faWebAwesome },
        { name: "User Award", icon: faAward },
        { name: "Profile", icon: faUser },
    ];

    return (
        <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="logo-container">
                <img src="/Bot.png" alt="Ecosort Logo" className={`logo ${isCollapsed ? 'collapsed-logo' : ''}`} />
            </div>

            <ul className="menu">
                {menuItems.map(item => (
                    allowedPages.includes(item.name) && (
                        <li
                            key={item.name}
                            className={`menu-item ${activeMenu === item.name ? 'active' : ''}`}
                            onClick={() => onMenuClick(item.name)}
                        >
                            <FontAwesomeIcon icon={item.icon} className="menu-icon" />
                            {!isCollapsed && <span className="menu-text">{item.name}</span>}
                        </li>
                    )
                ))}
            </ul>
        </div>
    );
};

export default Sidebar;
