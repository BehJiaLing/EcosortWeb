import React from "react";
import { useNavigate } from 'react-router-dom';
import './Navbar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import api from "../services/api";

const Navbar = ({ toggleSidebar, isSidebarVisible }) => {
    const navigate = useNavigate();

    const username = localStorage.getItem("username");
    const roleId = JSON.parse(localStorage.getItem("role"));

    // Convert role ID to readable name
    const getRoleName = (id) => {
        switch (id) {
            case "tVyg7N1TvIJrJK0VLGTI":
                return "Admin";
            case "YnEt3wtlZpDFL2N6EHoH":
                return "User";
            default:
                return "";
        }
    };

    const roleName = getRoleName(roleId);

    const handleLogout = async () => {
        try {
            await api.post("/api/auth/logout");
            localStorage.clear();
            alert("Logged out successfully!");
            navigate("/login"); 
        } catch (err) {
            console.error("Logout error:", err);
            localStorage.clear();
            navigate("/login");
        }
    };

    return (
        <nav className="navbar">
            <div className="navbar-left">
                {/* Sidebar toggle button */}
                <button className="menu-button" onClick={toggleSidebar}>
                    <FontAwesomeIcon icon={isSidebarVisible ? faTimes : faBars} />
                </button>
                <span className="navbar-title">Ecosort Bot</span>
            </div>

            <div className="navbar-center">
                {username ? (
                    <span className="navbar-welcome">
                        <b>Welcome {roleName} {username}!</b>
                    </span>
                ) : (
                    <span className="navbar-welcome">Welcome!</span>
                )}
            </div>

            <div className="navbar-right">
                <button className="logout-button" onClick={handleLogout}>
                    <FontAwesomeIcon icon={faSignOutAlt} />
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
