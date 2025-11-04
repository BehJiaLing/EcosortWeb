import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import api from '../services/api';
import Navbar from '../components/navbar';
import Sidebar from '../components/sidebar';
import './Dashboard.css';
import WasteLog from './WasteLog';
import Access from './Access';
import Award from './Award';
import Summary from './Summary';
import Profile from './Profile';
import WasteLogDetails from "./WasteLogDetails";
import RolePageAccess from './RolePageAccess';
import RoleUserAccess from './RoleUserAccess';
import Redeem from './Redeem';
import Tracking from './Tracking';
import UserAward from './UserAward';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

export default function Dashboard() {
    const navigate = useNavigate();
    const [activeContent, setActiveContent] = useState("Dashboard");
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedRole, setSelectedRole] = useState(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

    // --- User session token checking ---
    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            localStorage.clear();
            navigate("/error");
            return;
        }

        try {
            const decoded = jwtDecode(token);

            if (decoded.exp < Date.now() / 1000) {
                localStorage.clear();
                navigate("/error");
            }
        } catch (err) {
            console.log("Invalid token:", err);
            localStorage.clear();
            navigate("/error");
        }
    }, [navigate]);

    // --- Handle menu click ---
    const handleMenuClick = (menu) => {
        setActiveContent(menu);
    };

    // --- When a date is clicked in WasteLogDates ---
    const handleDateClick = (date) => {
        setSelectedDate(date);
        setActiveContent("WasteLogDetails");
    };

    // --- Role management ---
    const [role, setRole] = useState(null);

    useEffect(() => {
        const savedRole = localStorage.getItem("role");
        if (savedRole) {
            const parsedRole = JSON.parse(savedRole);
            setRole(parsedRole);

            // Default content based on role
            if (parsedRole === "YnEt3wtlZpDFL2N6EHoH") { // Example: "User" role ID
                setActiveContent("User Reward");
            } else {
                setActiveContent("Dashboard");
            }
        }
    }, []);

    // --- Allowed Pages from backend ---
    const [allowedPages, setAllowedPages] = useState([]);
    const [loadingAccess, setLoadingAccess] = useState(true);

    const refreshSidebarAccess = async () => {
        try {
            const res = await api.get(`/api/access/roles/${role}/pages`);
            setAllowedPages(res.data.pages);
        } catch (err) {
            console.error("Failed to refresh sidebar access:", err);
        }
    };

    useEffect(() => {
        const fetchAccess = async () => {
            try {
                setLoadingAccess(true);
                const res = await api.get(`/api/access/roles/${role}/pages`);
                setAllowedPages(res.data.pages); // e.g. ["Dashboard", "Waste Logs"]
            } catch (err) {
                console.error("Failed to fetch access pages:", err);
            } finally {
                setLoadingAccess(false);
            }
        };
        if (role) fetchAccess();
    }, [role]);

    // --- Render content ---
    const renderContent = () => {
        if (loadingAccess) {
            return <div className="loading-section">
                <FontAwesomeIcon icon={faSpinner} spin /> Loading permission...
            </div>;
        }

        // Sub-views that don’t need direct permission check
        const subViews = ["WasteLogDetails", "RolePageAccess", "RoleUserAccess"];

        if (!subViews.includes(activeContent) && !allowedPages.includes(activeContent)) {
            return <div className="p-4 text-red-600 font-bold">🚫 No permission to view this page.</div>;
        }

        switch (activeContent) {
            case "Dashboard":
                return <Summary />;
            case "Waste Logs":
                return <WasteLog onDateClick={handleDateClick} />;
            case "WasteLogDetails": // sub-view
                return <WasteLogDetails date={selectedDate} />;
            case "Waste Audit":
                return <Tracking />;
            case "Access Management":
                return (
                    <Access
                        setActiveContent={setActiveContent}
                        setSelectedRole={setSelectedRole}
                    />
                );
            case "RolePageAccess": // sub-view
                return (
                    <RolePageAccess
                        role={selectedRole}
                        onClose={() => setActiveContent("Access Management")}
                        refreshSidebar={refreshSidebarAccess}
                    />
                );
            case "RoleUserAccess": // sub-view
                return (
                    <RoleUserAccess
                        role={selectedRole}
                        onClose={() => setActiveContent("Access Management")}
                    />
                );
            case "Redeem Reward":
                return <Redeem />;
            case "Reward Activity":
                return <Award />;
            case "User Reward":
                return <UserAward />;
            case "Profile":
                return <Profile />;
            default:
                return <div>Welcome</div>;
        }
    };

    return (
        <div className="dashboard-wrapper">
            <Navbar
                toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                isSidebarVisible={!isSidebarCollapsed}
            />

            <div className="dashboard-container">
                {!loadingAccess && (
                    <Sidebar
                        isCollapsed={isSidebarCollapsed}
                        onMenuClick={handleMenuClick}
                        activeMenu={activeContent}
                        allowedPages={allowedPages}
                    />
                )}

                <main className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
                    {renderContent()}
                </main>
            </div>
        </div>
    );
}