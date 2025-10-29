import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import "./WasteLog.css";

export default function Award() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });

    // ✅ Fetch users (optionally filtered by month)
    const fetchUsers = async (month = selectedMonth) => {
        try {
            setLoading(true);
            const res = await api.get(`/api/award/users?month=${month}`);
            setUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch award users:", err);
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

    // ✅ Handle month change
    const handleMonthChange = (e) => {
        const selected = e.target.value;
        const today = new Date();
        const selectedDate = new Date(selected);

        // ❌ Prevent selecting future month
        if (selectedDate > today) {
            alert("Cannot select a future month!");
            return;
        }

        setSelectedMonth(selected);
        fetchUsers(selected);
    };

    return (
        <div className="content-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2>Reward Point Ranking</h2>

                {/* ✅ Month filter */}
                <div>
                    <label style={{ marginRight: 8 }}>Filter by Month:</label>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={handleMonthChange}
                        max={new Date().toISOString().slice(0, 7)} // disable future months
                        style={{ padding: "4px 8px" }}
                    />
                </div>
            </div>

            {loading ? (
                <div className="loading-section">
                    <FontAwesomeIcon icon={faSpinner} spin /> Loading reward activity...
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
                                    <tr key={user.id}>
                                        <td>{index + 1}</td>
                                        <td>{user.username || "-"}</td>
                                        <td>{user.email || "-"}</td>
                                        <td>{user.points || 0}</td>
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
