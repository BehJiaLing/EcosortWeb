import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faPlus, faTrash, faFileExcel } from '@fortawesome/free-solid-svg-icons';
import * as XLSX from 'xlsx';
import './Access.css';
import './WasteLog.css';
import './Summary.css';

export default function RoleUserAccess({ role, onClose, refreshRoles }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [deletingUserId, setDeletingUserId] = useState(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await api.get(`/api/access/roles/${role.id}/users`);
                setUsers(res.data || []);
            } catch (err) {
                console.error(err);
                alert('Error fetching users');
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [role]);

    const addUser = async () => {
        if (role.roleName === "User") {
            alert("Cannot manually add users to the 'User' role. All registered users are part of it automatically.");
            return;
        }

        const email = prompt('Enter user email:');
        if (!email || !email.trim()) return;

        const username = prompt('Enter username (optional):') || '';
        const phone = prompt('Enter phone (optional):') || '';

        if (users.some(u => u.email === email.trim())) {
            alert('This user already has the role');
            return;
        }

        setAdding(true);
        try {
            const body = { email: email.trim() };
            if (username.trim()) body.username = username.trim();
            if (phone.trim()) body.phone = phone.trim();

            const res = await api.post(`/api/access/roles/${role.id}/users`, body);
            alert(res.data?.message || 'User added successfully');
            if (res.data?.user) {
                setUsers(prev => [...prev, res.data.user]);
            } else {
                setUsers(prev => [...prev, { id: Math.random().toString(36).slice(2), ...body }]);
            }
            if (refreshRoles) refreshRoles();
        } catch (err) {
            console.error(err);
            alert(`Failed to add user: ${err.response?.data?.error || err.message}`);
        } finally {
            setAdding(false);
        }
    };

    const exportToExcel = () => {
        if (!users.length) {
            alert('No users to export');
            return;
        }

        const rows = users.map((u, i) => ({
            "No": i + 1,
            "Email": u.email ?? '-',
            "Username": u.username ?? u.name ?? '-',
            "Phone": u.phone && u.phone.trim() ? u.phone : "User didn't set up",
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Role_${role.roleName}`);
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        XLSX.writeFile(wb, `Users_${role.roleName}_${stamp}.xlsx`);
    };

    return (
        <div className="content-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2>User Access for "{role.roleName}"</h2>
                <div style={{ display: 'flex', gap: 10 }}>
                    {/* {role.roleName !== "User" && (
                        <button className="add-button" onClick={addUser} disabled={adding}>
                            {adding ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPlus} />} Add User
                        </button>
                    )} */}
                    {!loading && (
                        <button className="export-button" onClick={exportToExcel}>
                            <FontAwesomeIcon icon={faFileExcel} /> Export
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="loading-section">
                    <FontAwesomeIcon icon={faSpinner} spin /> Loading users...
                </div>
            ) : (
                <div className="table-container">
                    <table className="roles-table">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>User Email</th>
                                <th>Username</th>
                                <th>Phone</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length ? (
                                users.map((user, index) => {
                                    const phoneText =
                                        user.phone && user.phone.trim()
                                            ? user.phone
                                            : "(User didn't set up)";
                                    return (
                                        <tr key={user.id ?? user.email ?? index}>
                                            <td>{index + 1}</td>
                                            <td>{user.email}</td>
                                            <td>{user.username ?? user.name ?? '-'}</td>
                                            <td>{phoneText}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center' }}>
                                        No users found
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
