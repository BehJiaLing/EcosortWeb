import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from "../services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSpinner, faKey, faEdit, faLock, faTrash, faUsers, faEye, faEyeSlash
} from "@fortawesome/free-solid-svg-icons";
import "./WasteLog.css";

export default function Profile() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [roleName, setRoleName] = useState("-");
    const [loading, setLoading] = useState(true);

    // Password toggle states
    const [showPassword, setShowPassword] = useState(false);
    const [realPassword, setRealPassword] = useState("********");

    // Username state
    const [editingUsername, setEditingUsername] = useState(false);

    // Phone number state
    const [phone, setPhone] = useState("Not yet Setup");
    const [editingPhone, setEditingPhone] = useState(false); // 👈 phone editing spinner

    // Token checking & fetch user data
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            localStorage.clear();
            navigate("/error");
            return;
        }

        const fetchUser = async () => {
            try {
                const res = await api.get("/api/auth/me");
                setUser(res.data);

                if (res.data.role) {
                    try {
                        const roleRes = await api.get(`/api/access/roles/${res.data.role}`);
                        setRoleName(roleRes.data.roleName);
                    } catch (err) {
                        console.error("Failed to fetch role name:", err);
                        setRoleName("Unknown");
                    }
                }

                // phone number
                if (res.data.phone && res.data.phone.trim() !== "") {
                    setPhone(res.data.phone);
                } else {
                    setPhone("Not yet Setup");
                }
            } catch (err) {
                console.error("Failed to fetch user:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchUser(); // initial fetch

        // 🔄 auto-refresh every 10 seconds
        // const intervalId = setInterval(fetchUser, 10000);
        // return () => clearInterval(intervalId); // cleanup on unmount
    }, [navigate]);

    // Toggle password visibility with verification
    const handleTogglePassword = async () => {
        if (!showPassword) {
            const entered = prompt("Enter your password to view:");
            if (!entered) return;

            try {
                const res = await api.post("/api/auth/verify-password", { password: entered });
                if (res.data.success) {
                    setRealPassword(entered);
                    setShowPassword(true);
                } else {
                    alert("Incorrect password.");
                }
            } catch (err) {
                console.error("Password verification failed:", err);
                alert("Error verifying password.");
            }
        } else {
            setRealPassword("********");
            setShowPassword(false);
        }
    };

    // Edit phone number
    const handleEditPhone = async () => {
        const newPhone = prompt("Enter your phone number:", phone !== "Not yet Setup" ? phone : "");
        if (newPhone === null) return; // cancel pressed

        setEditingPhone(true); // 👈 show spinner
        try {
            await api.put("/api/auth/update-phone", { phone: newPhone });
            setPhone(newPhone && newPhone.trim() !== "" ? newPhone : "Not yet Setup");
            alert("Phone number updated successfully!");
        } catch (err) {
            console.error("Failed to update phone:", err);
            alert("Error updating phone number.");
        } finally {
            setEditingPhone(false); // 👈 stop spinner
        }
    };

    // Edit username
    const handleEditUsername = async () => {
        const newUsername = prompt("Enter your new username:", user?.username || "");
        if (newUsername === null) return; // cancel pressed

        setEditingUsername(true);
        try {
            await api.put("/api/auth/update-username", { username: newUsername });
            setUser((prev) => ({ ...prev, username: newUsername }));
            alert("Username updated successfully!");
        } catch (err) {
            console.error("Failed to update username:", err);
            alert("Error updating username.");
        } finally {
            setEditingUsername(false);
        }
    };

    // Reset password flow
    const handleResetPassword = async () => {
        const entered = prompt("Enter your current password to reset:");
        if (!entered) return;

        try {
            const res = await api.post("/api/auth/verify-password", { password: entered });
            if (res.data.success) {
                alert("Password verified. You will be signed out and redirected to reset password.");
                localStorage.clear();
                navigate("/reset-password"); // 👈 redirect to reset password page
            } else {
                alert("Incorrect password.");
            }
        } catch (err) {
            console.error("Password verification failed:", err);
            alert("Error verifying password.");
        }
    };

    return (
        <div className="content-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2>Profile</h2>
            </div>

            {loading ? (
                <div className="loading-section"><FontAwesomeIcon icon={faSpinner} spin /> Loading profile...</div>
            ) : (
                <div className="table-container">
                    <table className="roles-table">
                        <tbody>
                            <tr>
                                <th>Username</th>
                                <td>
                                    {user?.username || "-"}
                                    <FontAwesomeIcon
                                        icon={editingUsername ? faSpinner : faEdit}
                                        spin={editingUsername}
                                        style={{ marginLeft: 10, cursor: "pointer" }}
                                        onClick={!editingUsername ? handleEditUsername : undefined}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <th>Email</th>
                                <td>{user?.email || "-"}</td>
                            </tr>
                            <tr>
                                <th>Password</th>
                                <td>
                                    {realPassword}
                                    <FontAwesomeIcon
                                        icon={showPassword ? faEyeSlash : faEye}
                                        style={{ marginLeft: 10, cursor: "pointer" }}
                                        onClick={handleTogglePassword}
                                    />
                                    <FontAwesomeIcon
                                        icon={faEdit}
                                        style={{ marginLeft: 10, cursor: "pointer", color: "orange" }}
                                        onClick={handleResetPassword}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <th>Role</th>
                                <td>{roleName}</td>
                            </tr>
                            <tr>
                                <th>Phone Number</th>
                                <td>
                                    {phone}
                                    <FontAwesomeIcon
                                        icon={editingPhone ? faSpinner : faEdit}
                                        spin={editingPhone}
                                        style={{ marginLeft: 10, cursor: "pointer" }}
                                        onClick={!editingPhone ? handleEditPhone : undefined}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
