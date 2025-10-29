import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { Doughnut, Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
} from "chart.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faFileExcel } from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx";
import "./Summary.css";

// Register everything needed for Doughnut + Bar
ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title
);

export default function Summary() {
    const navigate = useNavigate();
    const chartRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState({});
    const [wasteLogs, setWasteLogs] = useState([]);

    // Recyclable/Non-Recyclable filter for Summary doughnut + table
    const [filter, setFilter] = useState("all");
    const [centerText, setCenterText] = useState({ label: "All", total: 0 });

    // Composition class filter (e.g., 'plastic', 'paper')
    const [classFilter, setClassFilter] = useState("all");

    // Safer date parser (handles Date, ISO, Firestore Timestamp)
    const parseDateValue = (val) => {
        if (!val) return null;
        if (typeof val?.toDate === "function") {
            try { return val.toDate(); } catch { }
        }
        if (typeof val === "object") {
            if (typeof val.seconds === "number") return new Date(val.seconds * 1000);
            if (typeof val._seconds === "number") return new Date(val._seconds * 1000);
            if (val.$date) {
                const d = new Date(val.$date);
                return isNaN(d) ? null : d;
            }
        }
        const d = new Date(val);
        return isNaN(d) ? null : d;
    };

    // Center text plugin for the Summary doughnut
    const centerTextPlugin = {
        id: "centerText",
        beforeDraw: (chart, args, options) => {
            const { ctx, chartArea: { top, bottom, left, right } } = chart;
            ctx.save();
            ctx.font = "bold 18px Arial";
            ctx.fillStyle = "#000";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(options.label, (left + right) / 2, (top + bottom) / 2 - 12);
            ctx.font = "bold 22px Arial";
            ctx.fillText(options.total, (left + right) / 2, (top + bottom) / 2 + 12);
            ctx.restore();
        },
    };

    // Update Summary center text
    useEffect(() => {
        let label = "All";
        let total = wasteLogs.length;
        if (filter === "Recyclable") {
            label = "Recyclable";
            total = wasteLogs.filter((log) => log.prediction === "Recyclable").length;
        } else if (filter === "Non-Recyclable") {
            label = "Non-Recyclable";
            total = wasteLogs.filter((log) => log.prediction === "Non-Recyclable").length;
        }
        setCenterText({ label, total });
    }, [filter, wasteLogs]);

    // Fetch summary + waste logs
    const fetchData = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                localStorage.clear();
                navigate("/error");
                return;
            }

            // Summary stats for Recyclable vs Non-Recyclable
            const resSummary = await api.get("/api/waste/summary");
            setChartData({
                labels: ["Recyclable", "Non-Recyclable"],
                datasets: [
                    {
                        label: "Total Waste",
                        data: [
                            resSummary.data.totalRecyclable,
                            resSummary.data.totalNonRecyclable,
                        ],
                        backgroundColor: ["#4caf50", "#f44336"],
                        borderWidth: 1,
                    },
                ],
            });

            // Logs for table + charts
            const resLogs = await api.get("/api/waste/all");
            const sorted = (Array.isArray(resLogs.data) ? resLogs.data : []).sort((a, b) => {
                const da = parseDateValue(a.collectedAt)?.getTime() || 0;
                const db = parseDateValue(b.collectedAt)?.getTime() || 0;
                return db - da; // newest first
            });
            setWasteLogs(sorted);
        } catch (err) {
            console.error("Failed to fetch summary data:", err);
            alert("Failed to load summary data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Helper: apply prediction filter
    const applyPredictionFilter = (list, pred) => {
        if (pred === "Recyclable") return list.filter(l => l.prediction === "Recyclable");
        if (pred === "Non-Recyclable") return list.filter(l => l.prediction === "Non-Recyclable");
        return list;
    };

    // Table rows: prediction + class filters
    const displayedLogs = applyPredictionFilter(wasteLogs, filter).filter((log) => {
        if (classFilter === "all") return true;
        const wc = (log.waste_class || "-").toLowerCase();
        return wc === classFilter;
    });

    // Export (respects current filters)
    const exportToExcel = () => {
        if (!displayedLogs.length) {
            alert("No logs to export");
            return;
        }

        const rows = displayedLogs.map((log) => {
            const d = parseDateValue(log.collectedAt);
            return {
                "Waste ID": log.wasteId ?? log.id ?? "-",
                "Collected At": d ? d.toLocaleString() : "-",
                "Prediction": log.prediction ?? "-",
                "Waste Class": log.waste_class ?? "-",
                "Points": log.pointsCollected ?? "-",
                "User Name": log.username ?? "-",
            };
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "SummaryLogs");
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        XLSX.writeFile(wb, `Summary_WasteLogs_${stamp}.xlsx`);
    };

    // Summary doughnut options (with center text)
    const doughnutOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true },
            centerText: { label: centerText.label, total: centerText.total },
        },
        cutout: "60%",
        onClick: (evt, elements) => {
            if (!elements.length) return;
            const index = elements[0].index;
            const label = chartData.labels[index];
            setFilter((prev) => (prev === label ? "all" : label));
        },
    };

    // Composition data
    const makeCompositionData = () => {
        const base = applyPredictionFilter(wasteLogs, filter);
        const counts = new Map();
        for (const log of base) {
            const key = (log.waste_class || "unknown").toLowerCase();
            counts.set(key, (counts.get(key) || 0) + 1);
        }
        const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
        const labels = entries.map(([k]) => k);
        const data = entries.map(([, v]) => v);
        return {
            labels,
            datasets: [{
                label: "Waste Composition",
                data,
                backgroundColor: [
                    "#4caf50", "#f44336", "#2196f3", "#ff9800",
                    "#9c27b0", "#009688", "#795548", "#3f51b5",
                    "#8bc34a", "#e91e63", "#00bcd4", "#cddc39"
                ],
                borderWidth: 0,
            }]
        };
    };
    const compositionData = makeCompositionData();

    // Composition pie
    const compositionOptions = {
        responsive: true,
        plugins: {
            legend: {
                display: true,
                position: "left",  // 👈 move legend to the left
                align: "center",
                labels: {
                    boxWidth: 14,
                    padding: 12,
                    font: { size: 12 },
                },
            },
            tooltip: { enabled: true },
            title: { display: false },
        },
        cutout: 0, // full pie
        onClick: (evt, elements) => {
            if (!elements.length) return;
            const idx = elements[0].index;
            const lbl = compositionData.labels[idx];
            setClassFilter(prev => (prev === lbl ? "all" : lbl));
        },
        elements: { arc: { borderWidth: 0 } },
    };

    // Bar data (last 6 months)
    const makeGroupedBarData = () => {
        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                year: d.getFullYear(),
                monthIdx: d.getMonth(),
                label: d.toLocaleString(undefined, { month: "short", year: "numeric" }),
            });
        }

        const recCounts = Array(months.length).fill(0);
        const nonRecCounts = Array(months.length).fill(0);

        for (const log of wasteLogs) {
            const d = parseDateValue(log.collectedAt);
            if (!d) continue;
            const y = d.getFullYear();
            const m = d.getMonth();
            const idx = months.findIndex((mm) => mm.year === y && mm.monthIdx === m);
            if (idx === -1) continue;

            if (log.prediction === "Recyclable") recCounts[idx] += 1;
            else if (log.prediction === "Non-Recyclable") nonRecCounts[idx] += 1;
        }

        return {
            labels: months.map((m) => m.label),
            datasets: [
                {
                    label: "Recyclable",
                    data: recCounts,
                    backgroundColor: "#4caf50",
                    borderRadius: 6,
                    borderSkipped: false,
                },
                {
                    label: "Non-Recyclable",
                    data: nonRecCounts,
                    backgroundColor: "#f44336",
                    borderRadius: 6,
                    borderSkipped: false,
                },
            ],
        };
    };

    const groupedBarData = makeGroupedBarData();

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: "top" },
            tooltip: { enabled: true },
            title: {
                display: true,
                text: "Monthly Waste by Type (Last 6 Months)",
                font: { size: 14, weight: "bold" },
            },
        },
        scales: {
            x: { stacked: false, grid: { display: false }, ticks: { maxRotation: 0 } },
            y: { stacked: false, beginAtZero: true, grid: { color: "rgba(0,0,0,0.06)" }, ticks: { precision: 0 } },
        },
    };

    return (
        <div className="content-section">
            <h2 style={{ marginBottom: 20, textAlign: "center" }}>Dashboard Summary</h2>

            {/* Monthly waste by type */}
            <div className="charts-wrapper">
                <div className="chart-box bar">
                    {loading ? (
                        <div className="loading-section">
                            <FontAwesomeIcon icon={faSpinner} spin /> Loading chart...
                        </div>
                    ) : (
                        <div className="chart-container-bar">
                            <Bar data={groupedBarData} options={barOptions} />
                        </div>
                    )}
                </div>
            </div>

            {/* Summary + Composition */}
            <div className="charts-wrapper">
                <div className="chart-box doughnut">
                    {loading ? (
                        <div className="loading-section">
                            <FontAwesomeIcon icon={faSpinner} spin /> Loading chart...
                        </div>
                    ) : (
                        <div className="chart-container-x">
                            <Doughnut
                                ref={chartRef}
                                data={chartData}
                                options={doughnutOptions}
                                plugins={[centerTextPlugin]}
                            />
                        </div>
                    )}
                </div>

                <div className="chart-box doughnut">
                    {loading ? (
                        <div className="loading-section">
                            <FontAwesomeIcon icon={faSpinner} spin /> Loading chart...
                        </div>
                    ) : (
                        <div className="chart-container-x">
                            <Doughnut
                                data={compositionData}
                                options={compositionOptions}  // full pie, no legend/tooltips/center text
                            />
                        </div>
                    )}
                </div>

            </div>

            {/* Waste Logs Table */}
            <div className="waste-history">
                <div className="search-filter-container" style={{ margin: "20px 0", gap: 12 }}>
                    <h2 style={{ margin: 0 }}>
                        {filter === "all" ? "All Waste Logs" : `${filter} Waste Logs`}
                        {classFilter !== "all" ? ` • ${classFilter}` : ""}
                    </h2>
                    {!loading && (
                        <button className="export-button" onClick={exportToExcel} style={{ cursor: "pointer" }}>
                            <FontAwesomeIcon icon={faFileExcel} /> Export
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="loading-section">
                        <FontAwesomeIcon icon={faSpinner} spin /> Loading table...
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="waste-table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Waste ID</th>
                                    <th>Collected At</th>
                                    <th>Prediction</th>
                                    <th>Waste Class</th>
                                    <th>Points</th>
                                    <th>User Name</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedLogs.length ? (
                                    displayedLogs.map((log, index) => {
                                        const d = parseDateValue(log.collectedAt);
                                        return (
                                            <tr key={log.id || log.wasteId || index}>
                                                <td>{index + 1}</td>
                                                <td>{log.wasteId}</td>
                                                <td>{d ? d.toLocaleString() : "Invalid date"}</td>
                                                <td>{log.prediction || "Unknown"}</td>
                                                <td>{log.waste_class || "Unknown"}</td>
                                                <td>{log.pointsCollected}</td>
                                                <td>{log.username}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: "center" }}>
                                            No waste logs found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
