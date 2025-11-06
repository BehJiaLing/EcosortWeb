import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faFileExcel } from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx";
import "./WasteLog.css";

export default function Award() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });

    // Fetch users (optionally filtered by month)
    const fetchUsers = async (month = selectedMonth) => {
        try {
            setLoading(true);
            const res = await api.get(`/api/award/users?month=${month}`);
            setUsers(res.data || []);
        } catch (err) {
            console.error("Failed to fetch award users:", err);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            localStorage.clear();
            navigate("/error");
            return;
        }
        fetchUsers();
    }, [navigate]);

    // Month change
    const handleMonthChange = (e) => {
        const selected = e.target.value;
        const today = new Date();
        const selectedDate = new Date(selected);

        if (selectedDate > today) {
            alert("Cannot select a future month!");
            return;
        }
        setSelectedMonth(selected);
        fetchUsers(selected);
    };

    // Export current table to Excel
    const exportRanking = () => {
        if (!users.length) {
            alert(`No data to export for ${selectedMonth}`);
            return;
        }

        // shape: Rank, Username, Email, Points, Month
        const rows = users.map((u, idx) => ({
            Rank: idx + 1,
            Username: u.username || "-",
            Email: u.email || "-",
            Points: typeof u.points === "number" ? u.points : 0,
            Month: selectedMonth,
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Ranking");
        const safeMonth = selectedMonth.replace(/:/g, "-");
        XLSX.writeFile(wb, `Waste_Point_Ranking_${safeMonth}.xlsx`);
    };

    return (
        <div className="content-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2>Waste Point Ranking</h2>

                {/* Month filter + Export */}
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <label style={{ marginRight: 8 }}>Filter by Month:</label>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={handleMonthChange}
                        max={new Date().toISOString().slice(0, 7)}
                        style={{ padding: "4px 8px" }}
                    />
                    <button
                        className="export-button"
                        onClick={exportRanking}
                        disabled={loading || !users.length}
                        title="Export current ranking to Excel"
                    >
                        <FontAwesomeIcon icon={faFileExcel} /> Export
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading-section">
                    <FontAwesomeIcon icon={faSpinner} spin /> Loading point ranking...
                </div>
            ) : (
                <div className="table-container">
                    <table className="roles-table">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length ? (
                                users.map((user, index) => (
                                    <tr key={user.id || index}>
                                        <td>{index + 1}</td>
                                        <td>{user.username || "-"}</td>
                                        <td>{user.email || "-"}</td>
                                        <td>{typeof user.points === "number" ? user.points : 0}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: "center" }}>
                                        No data found for {selectedMonth}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
