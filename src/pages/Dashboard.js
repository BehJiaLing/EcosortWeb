import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
        const checkSession = async () => {
            try {
                await api.get("/api/auth/meAccess");
            } catch (err) {
                console.error("Session check failed:", err);
                if (err.response?.status === 401) {
                    localStorage.clear();       
                    navigate("/error");         
                }
            }
        };

        checkSession();
    }, [navigate]);


    // --- Handle menu click ---
    const handleMenuClick = (menu) => {
        setActiveContent(menu);
        localStorage.setItem("activeContent", menu);
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
        const storedActive = localStorage.getItem("activeContent");

        let parsedRole = null;

        if (savedRole) {
            parsedRole = JSON.parse(savedRole);
            setRole(parsedRole);
        }

        if (storedActive) {
            setActiveContent(storedActive);
        } else {
            if (parsedRole === "YnEt3wtlZpDFL2N6EHoH") {  
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
                setAllowedPages(res.data.pages); 
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
            case "Point Ranking":
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