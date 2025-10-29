import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarAlt, faTrash, faSpinner } from "@fortawesome/free-solid-svg-icons";
import "./WasteLog.css";

export default function WasteLog({ onDateClick }) {
    const [logs, setLogs] = useState([]);
    const [startDate, setStartDate] = useState(""); // new
    const [endDate, setEndDate] = useState("");     // new
    const [filterMonth, setFilterMonth] = useState("");
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const navigate = useNavigate();

    const fetchLogs = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const res = await api.get("/api/waste");
            setLogs(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            localStorage.clear();
            navigate("/error");
        } else {
            fetchLogs(true);
        }
    }, [navigate]);

    const formatDate = (timestamp) => timestamp.split(" ")[0];

    const handleDeleteByDate = async (dateStr) => {
        if (!dateStr) return;

        const candidates = logs.filter(
            (log) => formatDate(log.timestamp) === dateStr && log.deleted !== true
        );

        const count = candidates.length;
        if (count === 0) {
            alert("No undeleted logs found for this date");
            return;
        }

        if (!window.confirm(`Are you sure you want to mark ${count} logs on ${dateStr} as deleted?`)) return;

        setDeleting(true);
        try {
            const res = await api.delete(`/api/waste/by-date/${dateStr}`);
            if (res.status === 200) {
                alert(`${count} Logs marked as deleted`);
                // Mark those candidates as deleted locally and hide them
                setLogs(prev =>
                    prev
                        .map(l => (formatDate(l.timestamp) === dateStr ? { ...l, deleted: true } : l))
                        .filter(l => l.deleted !== true)
                );
            } else {
                alert(res.data.error || "Failed to mark logs as deleted.");
            }
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || "Error marking logs as deleted");
        } finally {
            setDeleting(false);
        }
    };

    const isDeleted = (log) => log.deleted === true;

    let visibleLogs = logs.filter(l => !isDeleted(l));

    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        visibleLogs = visibleLogs.filter(log => {
            const logDate = new Date(formatDate(log.timestamp));
            return logDate >= start && logDate <= end;
        });
    } else if (filterMonth) {
        visibleLogs = visibleLogs.filter(log =>
            formatDate(log.timestamp).startsWith(filterMonth)
        );
    }

    const uniqueDates = [...new Set(
        visibleLogs.map(log => formatDate(log.timestamp))
    )]
        .filter(Boolean)
        .sort((a, b) => b.localeCompare(a));

    const handleDateClick = (date) => {
        if (onDateClick) onDateClick(date);
    };

    const todayStr = new Date().toISOString().split("T")[0]; // 🟩 for max attribute

    return (
        <div className="content-section">
            <h2>Waste Logs Lists</h2>

            <div className="search-filter-container">
                {/* DATE RANGE FILTER */}
                <label className="search-filter-container-label">Search by date range:</label>
                <div className="search-filter-container-details">
                    <input
                        type="date"
                        value={startDate}
                        max={todayStr} // prevent future
                        onChange={e => {
                            setStartDate(e.target.value);
                            setFilterMonth("");
                        }}
                        className="search-input"
                    />
                    <span style={{ margin: "0 6px" }}>to</span>
                    <input
                        type="date"
                        value={endDate}
                        min={startDate}
                        max={todayStr} // prevent future
                        onChange={e => {
                            setEndDate(e.target.value);
                            setFilterMonth("");
                        }}
                        className="search-input"
                    />
                </div>

                {/* MONTH FILTER */}
                {/* <div className="search-filter-container-details">
                    <label className="search-filter-container-label">Search by month:</label>
                    <input
                        type="month"
                        value={filterMonth}
                        max={todayStr.slice(0, 7)} // prevent future
                        onChange={e => {
                            setFilterMonth(e.target.value);
                            setStartDate("");
                            setEndDate("");
                        }}
                        className="search-input"
                    />
                </div> */}
            </div>

            {loading ? (
                <div className="loading-section">
                    <FontAwesomeIcon icon={faSpinner} spin /> Loading logs...
                </div>
            ) : (
                <div className="table-container">
                    <table className="waste-table">
                        <thead>
                            <tr>
                                <th></th>
                                <th>Date</th>
                                <th>Delete</th>
                            </tr>
                        </thead>
                        <tbody>
                            {uniqueDates.length > 0 ? uniqueDates.map((dateStr, index) => (
                                <tr key={dateStr} className={index % 2 === 0 ? "even" : "odd"}>
                                    <td className="icon-cell">
                                        <FontAwesomeIcon icon={faCalendarAlt} />
                                    </td>
                                    <td
                                        className="clickable-date"
                                        onClick={() => handleDateClick(dateStr)}
                                    >
                                        {new Date(dateStr).toLocaleDateString("en-GB", {
                                            day: "2-digit",
                                            month: "long",
                                            year: "numeric",
                                        })}
                                    </td>
                                    <td>
                                        <button
                                            className="delete-btn"
                                            onClick={() => handleDeleteByDate(dateStr)}
                                            disabled={deleting}
                                            style={{ minWidth: "32px" }}
                                        >
                                            {deleting ? (
                                                <FontAwesomeIcon icon={faSpinner} spin />
                                            ) : (
                                                <FontAwesomeIcon icon={faTrash} />
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="3" className="no-records">
                                        <FontAwesomeIcon icon={faCalendarAlt} className="grey-icon" /> No records found
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
