// src/pages/Tracking.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import * as XLSX from "xlsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faUndo, faFileExcel } from "@fortawesome/free-solid-svg-icons";
import "./WasteLog.css";
import "./Summary.css";

export default function Tracking() {
    const [loading, setLoading] = useState(false);
    const [allRows, setAllRows] = useState([]);   // raw data (fetched once)

    // Filters (client-side)
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [userEmail, setUserEmail] = useState("");

    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Fetch once (no query params); backend returns deleted items
    const fetchDeletedOnce = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/waste/deleted`);
            setAllRows(res.data || []);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || "Failed to fetch tracking data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeletedOnce();
    }, []);

    // Formatters
    const formatTime = (s) => {
        if (!s) return "-";
        const d = new Date(s);
        return isNaN(d) ? s : d.toLocaleString();
    };

    // Client-side filter: Deleted By + Date range on deletedAt (or on timestamp if preferred)
    const filteredRows = useMemo(() => {
        const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
        const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
        const email = userEmail.trim().toLowerCase();

        return (allRows || []).filter((r) => {
            // deletedBy filter
            if (email && !(r.deletedBy || "").toLowerCase().includes(email)) return false;

            // date range filter on deletedAt
            const basis = r.deletedAt || null;
            if (from || to) {
                if (!basis) return false;
                const d = new Date(basis);
                if (isNaN(d)) return false;
                if (from && d < from) return false;
                if (to && d > to) return false;
            }

            return true;
        });
    }, [allRows, dateFrom, dateTo, userEmail]);

    // Export only filtered rows
    const exportExcel = () => {
        if (!filteredRows.length) return alert("Nothing to export");
        const data = filteredRows.map((r) => ({
            "Waste ID": r.id,
            "Prediction": r.prediction ?? "-",
            "Waste Class": r.waste_class ?? "Unknown",
            "Confidence": r.confidence != null ? Math.round(r.confidence * 100) + "%" : "-",
            "Collected At": r.timestamp ? formatTime(r.timestamp) : "-",
            "Deleted At": r.deletedAt ? formatTime(r.deletedAt) : "-",
            "Deleted By": r.deletedBy ?? "-",
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "DeletedLogs");
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        XLSX.writeFile(wb, `Deleted_Waste_Logs_${stamp}.xlsx`);
    };

    // Restore one row (keep client list in sync)
    const restore = async (id) => {
        if (!window.confirm("Restore this log?")) return;
        try {
            await api.patch(`/api/waste/${id}/restore`);
            setAllRows((prev) => prev.filter((r) => r.id !== id));
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || "Failed to restore");
        }
    };

    return (
        <div className="content-section">
            <h2 style={{ marginBottom: 16 }}>Audit &amp; Tracking</h2>

            {/* Filters (client-side) */}
            <div className="search-filter-container" style={{ gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label>From</label>
                    <input
                        type="date"
                        value={dateFrom}
                        max={todayStr} // prevent future
                        onChange={(e) => {
                            const v = e.target.value;
                            setDateFrom(v);
                            // ensure To >= From
                            if (dateTo && v && dateTo < v) setDateTo(v);
                        }}
                    />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label>To</label>
                    <input
                        type="date"
                        value={dateTo}
                        min={dateFrom || undefined}
                        max={todayStr} // prevent future
                        onChange={(e) => setDateTo(e.target.value)}
                    />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label>Deleted By</label>
                    <input
                        type="email"
                        placeholder="user@email.com"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                    />
                </div>

                <button className="export-button" onClick={exportExcel} disabled={loading}>
                    <FontAwesomeIcon icon={faFileExcel} /> Export
                </button>
            </div>

            {loading ? (
                <div className="loading-section">
                    <FontAwesomeIcon icon={faSpinner} spin /> Loading...
                </div>
            ) : (
                <div className="table-container" style={{ marginTop: 16 }}>
                    <table className="waste-table">
                        <thead>
                            <tr>
                                <th>Waste ID</th>
                                <th>Prediction</th>
                                <th>Waste Class</th>
                                <th>Confidence</th>
                                <th>Collected At</th>
                                <th>Deleted At</th>
                                <th>Deleted By</th>
                                <th>Restore</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.length ? (
                                filteredRows.map((r, idx) => (
                                    <tr key={r.id ?? idx}>
                                        <td>{r.id}</td>
                                        <td>{r.prediction ?? "-"}</td>
                                        <td>{r.waste_class ?? "Unknown"}</td>
                                        <td>{r.confidence != null ? Math.round(r.confidence * 100) + "%" : "-"}</td>
                                        <td>{r.timestamp ? formatTime(r.timestamp) : "-"}</td>
                                        <td>{r.deletedAt ? formatTime(r.deletedAt) : "-"}</td>
                                        <td>{r.deletedBy ?? "-"}</td>
                                        <td>
                                            <button className="add-button" onClick={() => restore(r.id)} title="Restore">
                                                <FontAwesomeIcon icon={faUndo} /> Restore
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: "center" }}>No deleted logs found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
