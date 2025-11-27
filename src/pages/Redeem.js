import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSpinner,
    faHistory,
    faBroom,
    faSearch,
    faEdit,
    faTrash,
    faPlus,
    faSave,
    faTimes,
} from "@fortawesome/free-solid-svg-icons";
import api from "../services/api";
import "./WasteLog.css";

export default function Redeem() {
    const [loading, setLoading] = useState(false);

    // ===== Catalog management =====
    const [awards, setAwards] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [editingAward, setEditingAward] = useState(null); // {id,name,cost}

    // ===== Redeem history states =====
    const [redeemHistory, setRedeemHistory] = useState([]);
    const [historyUserId, setHistoryUserId] = useState(null);     // null => all users
    const [historyUserInfo, setHistoryUserInfo] = useState(null); // { id, username, points }
    const [userIdInput, setUserIdInput] = useState("");

    useEffect(() => {
        fetchAwards();
        fetchAllRedeemHistory();
    }, []);

    // --- Date helper (robust) ---
    const parseDateValue = (val) => {
        if (!val) return null;
        if (typeof val?.toDate === "function") { try { return val.toDate(); } catch { } }
        if (typeof val === "object") {
            if (typeof val.seconds === "number") return new Date(val.seconds * 1000);
            if (typeof val._seconds === "number") return new Date(val._seconds * 1000);
            if (val.$date) { const d = new Date(val.$date); return isNaN(d) ? null : d; }
        }
        const d = new Date(val);
        return isNaN(d) ? null : d;
    };

    // ======= Catalog APIs =======
    const fetchAwards = async () => {
        try {
            const res = await api.get("/api/award/catalog");
            setAwards(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Error loading awards:", err);
            setAwards([]);
        }
    };

    const handleSaveAward = async () => {
        const { id, name, cost } = editingAward || {};
        if (!name || Number(cost) <= 0) {
            alert("Please enter a valid name and a cost greater than 0.");
            return;
        }

        try {
            const payload = {
                id: id?.trim() ? id.trim() : undefined,
                name: name.trim(),
                cost: Number(cost),
            };

            const exists = awards.some((a) => a.id === id);

            if (exists) {
                await api.put(`/api/award/${id}`, payload);
            } else {
                await api.post("/api/award/add", payload);
            }

            alert("✅ Award saved successfully.");
            setEditingAward(null);
            fetchAwards();
        } catch (err) {
            console.error("Save award failed:", err);
            alert(`❌ Failed: ${err.response?.data?.error || err.message}`);
        }
    };

    const handleDeleteAward = async (id) => {
        if (!window.confirm("Delete this award?")) return;
        try {
            await api.delete(`/api/award/${id}`);
            fetchAwards();
            alert("🗑️ Award deleted successfully.");
        } catch (err) {
            console.error("Delete award failed:", err);
            alert(`❌ Failed: ${err.response?.data?.error || err.message}`);
        }
    };

    // ======= History APIs =======
    const fetchUserInfo = async (userId) => {
        try {
            const res = await api.get(`/api/award/user/${userId}`);
            if (res?.data) setHistoryUserInfo(res.data);
        } catch (err) {
            console.error("Failed to fetch user info:", err);
            setHistoryUserInfo(null);
        }
    };

    const fetchAllRedeemHistory = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/award/redeem-history`);
            const rows = Array.isArray(res.data) ? res.data : [];
            setRedeemHistory(rows);
            setHistoryUserId(null);
            setHistoryUserInfo(null);
        } catch (err) {
            console.error("Failed to fetch all redeem history:", err);
            setRedeemHistory([]);
            alert(`❌ Failed to fetch redeem history: ${err.response?.data?.error || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const fetchRedeemHistory = async (userId) => {
        if (!userId) return;
        try {
            setLoading(true);
            const res = await api.get(`/api/award/redeem-history?userId=${userId}`);
            const rows = Array.isArray(res.data) ? res.data : [];
            setRedeemHistory(rows);
            setHistoryUserId(userId);
            await fetchUserInfo(userId);
        } catch (err) {
            console.error("Failed to fetch redeem history:", err);
            setRedeemHistory([]);
            setHistoryUserInfo(null);
            alert(`❌ Failed to fetch redeem history: ${err.response?.data?.error || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // ======= Search handlers =======
    const handleSearch = () => {
        const id = userIdInput.trim();
        if (!id) {
            alert("Enter a User ID to search.");
            return;
        }
        fetchRedeemHistory(id);
    };
    const handleKeyDown = (e) => {
        if (e.key === "Enter") handleSearch();
    };

    return (
        <div className="content-section">
            <h2 style={{ marginBottom: 14 }}>Redeem Reward Management</h2>

            {/* ===== Catalog Management ===== */}
            <div className="waste-history" style={{ marginBottom: 26 }}>
                <div style={gridHeaderStyle}>
                    <h3>{editMode ? "Manage Reward Catalog" : "Reward Catalog"}</h3>
                    <button
                        onClick={() => {
                            setEditMode((prev) => {
                                const next = !prev;
                                if (!next) setEditingAward(null);
                                return next;
                            });
                        }}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: editMode ? "#6b7280" : "#2196f3",
                            color: "white",
                            border: "none",
                            borderRadius: 5,
                        }}
                    >
                        <FontAwesomeIcon icon={editMode ? faTimes : faEdit} />{" "}
                        {editMode ? "Close Edit" : "Edit Rewards"}
                    </button>
                </div>

                <div style={gridStyle}>
                    {[...awards]
                        .sort((a, b) => Number(a.cost) - Number(b.cost))
                        .map((award) => (
                            <div
                                key={award.id}
                                className="award-tile"
                                style={{
                                    padding: 16,
                                    borderRadius: 10,
                                    border: "1px solid #e5e7eb",
                                    background: "#ffffff",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                }}
                            >
                                <div style={{ fontWeight: 600 }}>{award.name}</div>
                                <div style={{ fontSize: 12, marginTop: 6 }}>Cost: {award.cost} pts</div>

                                {editMode && (
                                    <div style={{ marginTop: 10 }}>
                                        <button
                                            onClick={() => setEditingAward(award)}
                                            style={{ color: "#2196f3", border: "none", background: "none", cursor: "pointer", marginRight: 8 }}
                                        >
                                            <FontAwesomeIcon icon={faEdit} /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAward(award.id)}
                                            style={{ color: "#f44336", border: "none", background: "none", cursor: "pointer" }}
                                        >
                                            <FontAwesomeIcon icon={faTrash} /> Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                </div>

                {editMode && (
                    <button
                        onClick={() => setEditingAward({ id: "", name: "", cost: 1 })}
                        style={{ marginTop: 16, padding: "10px 20px", backgroundColor: "#4caf50", color: "white", borderRadius: 5, border: "none" }}
                    >
                        <FontAwesomeIcon icon={faPlus} /> Add New Reward
                    </button>
                )}
            </div>

            {/* Editing Modal */}
            {editingAward && (
                <div style={overlayStyle}>
                    <div style={{ background: "#fff", padding: 20, borderRadius: 8, width: 360 }}>
                        <h3>{awards.some((a) => a.id === editingAward.id) ? "Edit Reward" : "Add Reward"}</h3>

                        {/* Optional: show/edit ID only for new items */}
                        {/* {!awards.some((a) => a.id === editingAward.id) && (
                            <>
                                <label style={labelStyle}>ID (optional)</label>
                                <input
                                    value={editingAward.id}
                                    onChange={(e) => setEditingAward({ ...editingAward, id: e.target.value })}
                                    style={inputStyle}
                                    placeholder="Leave blank for auto ID"
                                />
                            </>
                        )} */}

                        <label style={labelStyle}>Name</label>
                        <input
                            value={editingAward.name}
                            onChange={(e) => setEditingAward({ ...editingAward, name: e.target.value })}
                            style={inputStyle}
                            placeholder="Reward name"
                        />

                        <label style={labelStyle}>Cost</label>
                        <input
                            type="number"
                            min={1}
                            value={editingAward.cost}
                            onChange={(e) => setEditingAward({ ...editingAward, cost: Number(e.target.value) })}
                            style={inputStyle}
                            placeholder="Cost in points"
                        />

                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                            <button onClick={handleSaveAward} style={saveBtnStyle}>
                                <FontAwesomeIcon icon={faSave} /> Save
                            </button>
                            <button onClick={() => setEditingAward(null)} style={cancelBtnStyle}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== History Controls ===== */}
            <h3>Redeem History</h3>
            <div style={controlsBar}>
                <div style={searchWrap}>
                    <input
                        value={userIdInput}
                        onChange={(e) => setUserIdInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter User ID…"
                        style={searchInput}
                    />
                    <button onClick={handleSearch} style={searchBtn}>
                        <FontAwesomeIcon icon={faSearch} /> Search
                    </button>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    {historyUserId && (
                        <button
                            onClick={() => fetchRedeemHistory(historyUserId)}
                            style={refreshBtn}
                            title="Refresh current user's history"
                        >
                            <FontAwesomeIcon icon={faHistory} /> Refresh
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setUserIdInput("");        
                            fetchAllRedeemHistory();   
                        }}
                        style={clearBtn}
                        title="Clear and show all users"
                    >
                        <FontAwesomeIcon icon={faBroom} /> Clear
                    </button>
                </div>
            </div>

            {/* Header label with user id + points */}
            <div style={{ margin: "6px 0 16px", color: "#6b7280" }}>
                {historyUserId ? (
                    <span>
                        Showing: <b>{historyUserId}</b>
                        {typeof historyUserInfo?.points === "number"
                            ? <> • <b>{historyUserInfo.points}</b> pts</>
                            : null}
                    </span>
                ) : (
                    <span>Showing: <b>All Users</b></span>
                )}
            </div>

            {/* ===== History Table ===== */}
            {loading && !redeemHistory.length ? (
                <div className="loading-section">
                    <FontAwesomeIcon icon={faSpinner} spin /> Loading table...
                </div>
            ) : (
                <div className="table-container">
                    <table className="waste-table">
                        <thead>
                            <tr>
                                <th>No</th>
                                {!historyUserId && <th>User ID</th>}
                                <th>Reward</th>
                                <th>Cost (pts)</th>
                                <th>Redeemed Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {redeemHistory && redeemHistory.length ? (
                                [...redeemHistory]
                                    .sort((a, b) => {
                                        const db = parseDateValue(b.redeemedAt)?.getTime() || 0;
                                        const da = parseDateValue(a.redeemedAt)?.getTime() || 0;
                                        return db - da;
                                    })
                                    .map((row, index) => {
                                        const d = parseDateValue(row.redeemedAt);
                                        return (
                                            <tr key={row.id || `${row.userId || "all"}-${row.awardId || "award"}-${index}`}>
                                                <td>{index + 1}</td>
                                                {!historyUserId && <td>{row.userId || "-"}</td>}
                                                <td>{row.awardName || row.awardId}</td>
                                                <td>{row.cost ?? "-"}</td>
                                                <td>{d ? d.toLocaleString() : "Invalid date"}</td>
                                            </tr>
                                        );
                                    })
                            ) : (
                                <tr>
                                    <td colSpan={historyUserId ? 4 : 5} style={{ textAlign: "center" }}>
                                        {historyUserId ? "No redeem history found for this user" : "No redeem history found"}
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

/* ===== tiny styles ===== */
const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    zIndex: 9999,
};
const labelStyle = { display: "block", marginTop: 8, marginBottom: 4, fontSize: 12, color: "#374151" };
const inputStyle = { width: "100%", marginBottom: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", boxSizing: "border-box"};
const saveBtnStyle = { background: "#4caf50", color: "white", padding: "8px 14px", borderRadius: 6, border: "none" };
const cancelBtnStyle = { background: "#9ca3af", color: "white", padding: "8px 14px", borderRadius: 6, border: "none" };

const controlsBar = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
};
const searchWrap = {
    display: "flex",
    gap: 8,
    alignItems: "center",
    width: "100%",
    maxWidth: 520,
};
const searchInput = {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    outline: "none",
};
const searchBtn = {
    padding: "10px 14px",
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    minWidth: 110,
};
const refreshBtn = {
    padding: "8px 12px",
    backgroundColor: "#10b981",
    color: "#fff",
    border: "none",
    borderRadius: 6,
};
const clearBtn = {
    padding: "8px 12px",
    backgroundColor: "#9ca3af",
    color: "#fff",
    border: "none",
    borderRadius: 6,
};
const gridHeaderStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
};
const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 15,
};
