import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faCalendarAlt, faTimes, faTrash, faFileExcel } from '@fortawesome/free-solid-svg-icons';
import { Doughnut } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import './WasteLog.css';

import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function WasteLogDetails({ date }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null); // per-row deleting
    const [modalImage, setModalImage] = useState(null);
    const [filterRecyclable, setFilterRecyclable] = useState('all');
    const isInitialFetch = useRef(true);

    const formatDate = (timestamp) => timestamp.split(" ")[0];

    useEffect(() => {
        if (!date) return;

        const fetchLogs = async () => {
            if (isInitialFetch.current) setLoading(true);
            try {
                const res = await api.get("/api/waste");
                // Keep only this date, and exclude soft-deleted logs
                const filteredByDate = (res.data || [])
                    .filter(log => log.timestamp && formatDate(log.timestamp) === date)
                    .filter(log => log.deleted !== true);
                setLogs(filteredByDate);
            } catch (err) {
                console.error(err);
            } finally {
                if (isInitialFetch.current) {
                    setLoading(false);
                    isInitialFetch.current = false;
                }
            }
        };

        fetchLogs();
        // const interval = setInterval(fetchLogs, 5000);
        // return () => clearInterval(interval);
    }, [date]);

    const handleImageClick = (img) => setModalImage(img);
    const closeModal = () => setModalImage(null);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to mark this log as deleted?")) return;
        setDeletingId(id);
        try {
            await api.delete(`/api/waste/${id}`);
            // Soft-deleted on backend; hide it locally by marking deleted
            setLogs(prev => prev.map(l => l.id === id ? { ...l, deleted: true } : l).filter(l => l.deleted !== true));
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || "Error deleting log");
        } finally {
            setDeletingId(null);
        }
    };

    // Filter logs according to chart selection (on non-deleted only)
    const visibleLogs = logs.filter(log => log.deleted !== true);
    const displayedLogs = visibleLogs.filter(log => {
        if (filterRecyclable === "all") return true;
        if (filterRecyclable === "recyclable") return log.prediction === "Recyclable";
        if (filterRecyclable === "non-recyclable") return log.prediction === "Non-Recyclable";
        return true;
    });

    // Export logs (exclude deleted)
    const exportToExcel = () => {
        if (displayedLogs.length === 0) {
            alert("No logs to export");
            return;
        }
        const data = displayedLogs.map(log => ({
            "Waste ID": log.id,
            "Prediction": log.prediction,
            "Confidence": log.confidence != null ? Math.round(log.confidence * 100) + "%" : "-",
            "Time": log.timestamp ? log.timestamp.split(" ")[1] : "-",
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "WasteLogs");
        XLSX.writeFile(workbook, `WasteLogs_${date}.xlsx`);
    };

    const totalRecyclable = visibleLogs.filter(log => log.prediction === "Recyclable").length;
    const totalNonRecyclable = visibleLogs.filter(log => log.prediction === "Non-Recyclable").length;

    const chartData = {
        labels: ['Recyclable', 'Non-Recyclable'],
        datasets: [
            {
                label: 'Waste Logs',
                data: [totalRecyclable, totalNonRecyclable],
                backgroundColor: ['#4caf50', '#f44336'],
                borderColor: ['#4caf50', '#f44336'],
                borderWidth: 1,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false, position: 'bottom', labels: { cursor: 'pointer' } },
            tooltip: { enabled: true },
        },
        onClick: (evt, elements) => {
            if (elements.length > 0) {
                const index = elements[0].index;
                const label = chartData.labels[index];
                setFilterRecyclable(prev => {
                    if (label === "Recyclable") return prev === "recyclable" ? "all" : "recyclable";
                    if (label === "Non-Recyclable") return prev === "non-recyclable" ? "all" : "non-recyclable";
                    return "all";
                });
            }
        }
    };

    return (
        <div className="content-section">
            <div className='search-filter-container'>
                <h2>Waste Logs for {date}</h2>
                <button className="export-button" onClick={exportToExcel} style={{ cursor: 'pointer' }}>
                    <FontAwesomeIcon icon={faFileExcel} /> Export
                </button>
            </div>

            {loading ? (
                <div className="loading-section">
                    <FontAwesomeIcon icon={faSpinner} spin /> Loading logs...
                </div>
            ) : (
                <>
                    <div className="chart-container">
                        <Doughnut data={chartData} options={chartOptions} />
                    </div>

                    <div className="table-container">
                        <table className="waste-table">
                            <thead>
                                <tr>
                                    <th>Waste ID</th>
                                    <th>Prediction</th>
                                    <th>Waste Class</th>
                                    <th>Confidence</th>
                                    <th>Time</th>
                                    <th>Image</th>
                                    <th>Delete</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedLogs.length > 0 ? displayedLogs.map((log, i) => {
                                    const time = log.timestamp ? log.timestamp.split(" ")[1] : "-";
                                    const isDeletingThis = deletingId === log.id;
                                    return (
                                        <tr key={log.id} className={i % 2 === 0 ? "even" : "odd"}>
                                            <td>{log.id}</td>
                                            <td>{log.prediction || "Unknown"}</td>
                                            <td>{log.waste_class || "Unknown"}</td>
                                            <td>{log.confidence != null ? Math.round(log.confidence * 100) + "%" : "-"}</td>
                                            <td>{time}</td>
                                            <td>
                                                {log.image_base64 ? (
                                                    <img
                                                        src={`data:image/jpeg;base64,${log.image_base64}`}
                                                        alt="Waste"
                                                        className="waste-img"
                                                        style={{ width: "80px", height: "80px", objectFit: "cover", cursor: "pointer" }}
                                                        onClick={() => handleImageClick(log.image_base64)}
                                                    />
                                                ) : <span>-</span>}
                                            </td>
                                            <td>
                                                <button
                                                    className="delete-btn"
                                                    onClick={() => handleDelete(log.id)}
                                                    disabled={isDeletingThis}
                                                    style={{ minWidth: "32px" }}
                                                    title="Mark as deleted"
                                                >
                                                    {isDeletingThis ? (
                                                        <FontAwesomeIcon icon={faSpinner} spin />
                                                    ) : (
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="6" className="no-records">
                                            <FontAwesomeIcon icon={faCalendarAlt} className="grey-icon" /> No records found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {modalImage && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <FontAwesomeIcon icon={faTimes} className="modal-close" onClick={closeModal} />
                        <img src={`data:image/jpeg;base64,${modalImage}`} alt="Waste Large" style={{ maxWidth: "80%", maxHeight: "80vh", objectFit: 'contain' }} />
                    </div>
                </div>
            )}
        </div>
    );
}
