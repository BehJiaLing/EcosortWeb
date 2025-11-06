import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faQrcode } from "@fortawesome/free-solid-svg-icons";
import { Scanner } from "@yudiel/react-qr-scanner";
import Barcode from "react-barcode"; 
import "./WasteLog.css";

export default function UserAward() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [wasteHistory, setWasteHistory] = useState([]);
    const [redeemHistory, setRedeemHistory] = useState([]);

    // Collect (waste) QR scanner
    const [scanning, setScanning] = useState(false);

    // self-serve redeem modal + catalog
    const [redeemModalOpen, setRedeemModalOpen] = useState(false);
    const [awards, setAwards] = useState([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [selectedAwardId, setSelectedAwardId] = useState(null);
    const selectedAward = awards.find((a) => a.id === selectedAwardId);

    // Barcode modal for redeemed rewards
    const [barcodeOpen, setBarcodeOpen] = useState(false);
    const [barcodeValue, setBarcodeValue] = useState("");

    const parseDateValue = (val) => {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d) ? null : d;
    };

    const fetchData = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                localStorage.clear();
                navigate("/error");
                return;
            }

            const resUser = await api.get("/api/auth/me");
            setUserData(resUser.data);

            const resRedeem = await api.get(`/api/award/redeem-history?userId=${resUser.data.id}`);
            setRedeemHistory(Array.isArray(resRedeem.data) ? resRedeem.data : []);

            const resHistory = await api.get("/api/waste/user-history");
            setWasteHistory(Array.isArray(resHistory.data) ? resHistory.data : []);
        } catch (err) {
            console.error("Failed to fetch user award data:", err);
            alert("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- Collect QR Scan ---
    const handleScan = async (data) => {
        if (data && data.text) {
            setScanning(false);
            let wasteId = data.text.trim();
            if (wasteId.startsWith("http")) wasteId = wasteId.split("/").pop();

            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const res = await api.post(
                    "/api/award/collect",
                    { wasteId },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                alert(`✅ Collected! You earned ${res.data.points} points.`);
                await fetchData();
            } catch (err) {
                console.error("Collect error:", err);
                alert(`❌ Failed: ${err.response?.data?.error || err.message}`);
            } finally {
                setLoading(false);
            }
        }
    };
    const handleError = (err) => console.error("QR Scan Error:", err);
    const handleCollect = () => setScanning(true);

    // --- Self-serve redeem flow ---
    const openRedeemModal = async () => {
        setRedeemModalOpen(true);
        setSelectedAwardId(null);
        setCatalogLoading(true);
        try {
            const res = await api.get("/api/award/catalog");
            setAwards(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Error loading awards:", err);
            setAwards([]);
            alert("Failed to load award catalog.");
        } finally {
            setCatalogLoading(false);
        }
    };

    const doSelfRedeem = async () => {
        if (!selectedAwardId) {
            alert("Please select an award first.");
            return;
        }
        if (!userData?.points && userData?.points !== 0) {
            alert("User data not ready.");
            return;
        }
        const cost = Number(selectedAward?.cost ?? 0);
        if (userData.points < cost) {
            alert("Not enough points to redeem this award.");
            return;
        }

        setCatalogLoading(true);
        try {
            const token = localStorage.getItem("token");
            let res;
            try {
                res = await api.post(
                    "/api/award/redeem",
                    { awardId: selectedAwardId },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            } catch (e1) {
                res = await api.post(
                    "/api/award/redeem",
                    { userId: userData.id, awardId: selectedAwardId },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            const { newBalance, award } = res.data || {};
            alert(`✅ Redeemed “${award?.name || selectedAwardId}”. New balance: ${newBalance} pts.`);
            setUserData((prev) =>
                prev ? { ...prev, points: typeof newBalance === "number" ? newBalance : prev.points - cost } : prev
            );

            try {
                const resRedeem = await api.get(`/api/award/redeem-history?userId=${userData.id}`);
                setRedeemHistory(Array.isArray(resRedeem.data) ? resRedeem.data : []);
            } catch { }

            setSelectedAwardId(null);
            setRedeemModalOpen(false);
        } catch (err) {
            console.error("Redeem error:", err);
            alert(`❌ Failed: ${err.response?.data?.error || err.message}`);
        } finally {
            setCatalogLoading(false);
        }
    };

    // Open/close barcode modal for a redeemed reward (id = redeem doc ID)
    const openBarcode = (redeemDocId) => {
        if (!redeemDocId) {
            alert("No reward ID found to generate barcode.");
            return;
        }
        setBarcodeValue(String(redeemDocId));
        setBarcodeOpen(true);
    };
    const closeBarcode = () => {
        setBarcodeOpen(false);
        setBarcodeValue("");
    };

    return (
        <div className="content-section">
            {/* Collect Scanner Modal */}
            {scanning && (
                <div style={overlayStyle}>
                    <h2 style={{ color: "white", marginBottom: 10 }}>Scan Waste QR Code</h2>
                    <div style={{ width: "90%", maxWidth: 400, background: "#000", padding: 8, borderRadius: 8 }}>
                        <Scanner
                            onScan={(result) => {
                                if (result && result.length > 0) {
                                    handleScan({ text: result[0].rawValue });
                                }
                            }}
                            onError={handleError}
                            constraints={{ facingMode: "environment" }}
                            styles={{ container: { width: "100%" } }}
                        />
                    </div>
                    <button onClick={() => setScanning(false)} style={cancelBtnStyle}>Cancel</button>
                </div>
            )}

            {/* Barcode Modal for redeemed reward */}
            {barcodeOpen && (
                <div style={overlayStyle}>
                    <div style={{ background: "#fff", padding: 20, borderRadius: 12, width: "min(600px, 92%)", textAlign: "center" }}>
                        <h2 style={{ marginBottom: 8 }}>Show this barcode to the shop</h2>
                        {/* <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
                            Reward ID: <b>{barcodeValue}</b>
                        </div> */}

                        {/* The actual barcode */}
                        <div style={{ background: "#ffffff", padding: 16, borderRadius: 8, display: "inline-block" }}>
                            <Barcode
                                value={barcodeValue}
                                width={2}           // thickness of bars
                                height={120}        // height of barcode
                                displayValue={true} // show text under barcode
                                fontSize={14}
                                margin={0}
                            />
                        </div>

                        <div style={{ marginTop: 18 }}>
                            <button onClick={closeBarcode} style={secondaryBtn}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Redeem Catalog Modal */}
            {redeemModalOpen && (
                <div style={overlayStyle}>
                    <div style={{ background: "#fff", padding: 20, borderRadius: 12, width: "min(720px, 92%)", maxHeight: "80vh", overflow: "auto" }}>
                        <h2 style={{ marginBottom: 10 }}>Redeem an Award</h2>
                        <div style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
                            Your points: <b>{userData?.points ?? 0}</b>
                        </div>

                        {catalogLoading ? (
                            <div style={{ textAlign: "center", padding: 20 }}>
                                <FontAwesomeIcon icon={faSpinner} spin /> Loading catalog...
                            </div>
                        ) : awards.length ? (
                            <>
                                <div style={gridStyle}>
                                    {[...awards]
                                        .sort((a, b) => Number(a.cost) - Number(b.cost))
                                        .map((a) => {
                                            const active = a.id === selectedAwardId;
                                            const disabled = (userData?.points ?? 0) < Number(a.cost);
                                            return (
                                                <div
                                                    key={a.id}
                                                    onClick={() => !disabled && setSelectedAwardId(active ? null : a.id)}
                                                    style={{
                                                        padding: 14,
                                                        borderRadius: 10,
                                                        border: active ? "2px solid #4caf50" : "1px solid #e5e7eb",
                                                        background: disabled ? "#f9fafb" : active ? "#f2f7f2" : "#ffffff",
                                                        opacity: disabled ? 0.6 : 1,
                                                        cursor: disabled ? "not-allowed" : "pointer",
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                                                    <div style={{ fontSize: 12, marginTop: 6 }}>Cost: {a.cost} pts</div>
                                                    {disabled && <div style={{ fontSize: 12, marginTop: 6, color: "#ef4444" }}>Insufficient points</div>}
                                                </div>
                                            );
                                        })}
                                </div>

                                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                                    <button onClick={() => setRedeemModalOpen(false)} style={secondaryBtn}>Close</button>
                                    <button
                                        onClick={doSelfRedeem}
                                        disabled={
                                            !selectedAwardId ||
                                            (userData?.points ?? 0) < Number(selectedAward?.cost ?? 0) ||
                                            catalogLoading
                                        }
                                        style={{
                                            ...primaryBtn,
                                            backgroundColor:
                                                !selectedAwardId ||
                                                    (userData?.points ?? 0) < Number(selectedAward?.cost ?? 0) ||
                                                    catalogLoading
                                                    ? "#9ca3af"
                                                    : "#4caf50",
                                            cursor:
                                                !selectedAwardId ||
                                                    (userData?.points ?? 0) < Number(selectedAward?.cost ?? 0) ||
                                                    catalogLoading
                                                    ? "not-allowed"
                                                    : "pointer",
                                        }}
                                    >
                                        {catalogLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : "Redeem"}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div style={{ padding: 12 }}>No awards available.</div>
                        )}
                    </div>
                </div>
            )}

            {/* User Points & Actions */}
            <div className="user-points" style={headerCardStyle}>
                <h3 style={{ fontSize: "1.2rem", marginBottom: 10 }}>Your Reward Points</h3>
                {loading ? (
                    <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                    <span style={{ fontSize: "3rem", fontWeight: "bold", color: "#ff9800" }}>
                        {userData?.points || 0}
                    </span>
                )}
                <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 15 }}>
                    <button onClick={handleCollect} style={collectBtn}>
                        <FontAwesomeIcon icon={faQrcode} /> Collect
                    </button>
                    <button onClick={openRedeemModal} style={redeemBtn}>
                        Redeem
                    </button>
                </div>
            </div>

            {/* Waste History Table */}
            <div className="waste-history" style={{ marginBottom: 20 }}>
                <h2 style={{ marginBottom: 20 }}>Waste Collection History</h2>
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
                                    <th>Waste Class</th>
                                    <th>Earned Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {wasteHistory.length ? (
                                    [...wasteHistory]
                                        .sort((a, b) => parseDateValue(b.collectedAt) - parseDateValue(a.collectedAt))
                                        .map((log, index) => {
                                            const d = parseDateValue(log.collectedAt);
                                            return (
                                                <tr key={log.id || `${log.wasteId}-${index}`}>
                                                    <td>{index + 1}</td>
                                                    <td>{log.wasteId}</td>
                                                    <td>{log.waste_class}</td>
                                                    <td>{d ? d.toLocaleString() : "Invalid date"}</td>
                                                </tr>
                                            );
                                        })
                                ) : (
                                    <tr>
                                        <td colSpan="3" style={{ textAlign: "center" }}>No waste history found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Redeem History Table + Barcode trigger */}
            <div className="waste-history" style={{ marginBottom: 20 }}>
                <h2 style={{ marginBottom: 20 }}>Redeem History</h2>
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
                                    <th>Reward</th>
                                    <th>Cost (pts)</th>
                                    <th>Redeemed Date</th>
                                    <th>Barcode</th>
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
                                                <tr key={row.id || `${row.awardId}-${index}`}>
                                                    <td>{index + 1}</td>
                                                    <td>{row.awardName || row.awardId}</td>
                                                    <td>{row.cost ?? "-"}</td>
                                                    <td>{d ? d.toLocaleString() : "Invalid date"}</td>
                                                    <td>
                                                        <button
                                                            className="add-button"
                                                            onClick={() => openBarcode(row.id)}
                                                            title="Show barcode for this reward"
                                                        >
                                                            Show Barcode
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: "center" }}>No redeem history found</td>
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

/* --- styles --- */
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
const cancelBtnStyle = {
    marginTop: 20,
    padding: "10px 20px",
    borderRadius: 5,
    background: "#f44336",
    color: "white",
    border: "none",
};
const headerCardStyle = {
    backgroundColor: "#f3f4f6",
    padding: 20,
    marginBottom: 30,
    borderRadius: 10,
    textAlign: "center",
};
const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 12,
};
const collectBtn = {
    padding: "10px 20px",
    backgroundColor: "#4caf50",
    color: "#fff",
    borderRadius: 5,
    border: "none",
};
const redeemBtn = {
    padding: "10px 20px",
    backgroundColor: "#f44336",
    color: "#fff",
    borderRadius: 5,
    border: "none",
};
const primaryBtn = {
    padding: "10px 20px",
    color: "white",
    borderRadius: 6,
    border: "none",
    backgroundColor: "#4caf50",
};
const secondaryBtn = {
    padding: "10px 20px",
    color: "white",
    borderRadius: 6,
    border: "none",
    backgroundColor: "#9ca3af",
};
