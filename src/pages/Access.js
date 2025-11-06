import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faUsers, faLock, faSpinner, faTrash } from '@fortawesome/free-solid-svg-icons';
import './Access.css';
import "./WasteLog.css";

export default function Access({ setActiveContent, setSelectedRole }) {
    const navigate = useNavigate();
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    const [addingRole, setAddingRole] = useState(false);
    const [editingRoleId, setEditingRoleId] = useState(null);
    const [deletingRoleId, setDeletingRoleId] = useState(null);

    const fetchRoles = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const res = await api.get('/api/access/roles');
            setRoles(res.data);
        } catch (err) {
            console.error(err);
            alert('Error fetching roles');
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            localStorage.clear();
            navigate('/error');
        } else {
            fetchRoles(true);
        }
    }, [navigate]);

    // Add role
    // const addRole = async () => {
    //     const roleName = prompt('Enter new role name:');
    //     if (!roleName) return;
    //     try {
    //         setAddingRole(true);
    //         await api.post('/api/access/roles', { roleName });
    //         await fetchRoles();
    //         alert(`Role "${roleName}" added successfully`);
    //     } catch (err) {
    //         console.error(err);
    //         alert(`Error adding role: ${err.response?.data?.error || err.message}`);
    //     } finally {
    //         setAddingRole(false);
    //     }
    // };

    // Edit role name
    const editRoleName = async (role) => {
        const newName = prompt('Enter new role name:', role.roleName);
        if (!newName || newName === role.roleName) return;

        try {
            setEditingRoleId(role.id);
            await api.put(`/api/access/roles/${role.id}`, { roleName: newName });
            await fetchRoles();
            alert(`Role "${role.roleName}" updated to "${newName}"`);
        } catch (err) {
            console.error(err);
            alert(`Failed to update role: ${err.response?.data?.error || err.message}`);
        } finally {
            setEditingRoleId(null);
        }
    };

    // Delete role
    // const deleteRole = async (role) => {
    //     if (!window.confirm(`Delete role "${role.roleName}"?`)) return;
    //     try {
    //         setDeletingRoleId(role.id);
    //         await api.delete(`/api/access/roles/${role.id}`);
    //         await fetchRoles();
    //         alert(`Role "${role.roleName}" deleted`);
    //     } catch (err) {
    //         console.error(err);
    //         alert(`Failed to delete role: ${err.response?.data?.error || err.message}`);
    //     } finally {
    //         setDeletingRoleId(null);
    //     }
    // };

    return (
        <div className="content-section">
            <div className="header-container">
                <h2>Access Management</h2>
                {/* <button className="add-button" onClick={addRole} disabled={addingRole} style={{ marginRight: 10 }}>
                    {addingRole ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPlus} />} Add Role
                </button> */}
            </div>

            {loading ? (
                <div className="loading-section"><FontAwesomeIcon icon={faSpinner} spin /> Loading roles...</div>
            ) : (
                <div className="table-container">
                    <table className="roles-table">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Role Name</th>
                                <th>Role Users</th>
                                <th>Role Page Access</th>
                                <th>Edit Role Name</th>
                                {/* <th>Delete Role</th> */}
                            </tr>
                        </thead>
                        <tbody>
                            {roles.length ? roles.map((role, idx) => (
                                <tr key={role.id}>
                                    <td>{idx + 1}</td>
                                    <td>{role.roleName}</td>
                                    <td>
                                        <button onClick={() => { setSelectedRole(role); setActiveContent('RoleUserAccess'); }} style={{ minWidth: 32 }}>
                                            <FontAwesomeIcon icon={faUsers} />
                                        </button>
                                    </td>
                                    <td>
                                        <button onClick={() => { setSelectedRole(role); setActiveContent('RolePageAccess'); }} style={{ minWidth: 32 }}>
                                            <FontAwesomeIcon icon={faLock} />
                                        </button>
                                    </td>
                                    <td>
                                        <button onClick={() => editRoleName(role)} style={{ minWidth: 32 }}>
                                            {editingRoleId === role.id ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faEdit} />}
                                        </button>
                                    </td>
                                    {/* <td>
                                        <span
                                            className="delete-btn"
                                            onClick={() => deleteRole(role)}
                                            disabled={deletingRoleId === role.id}
                                            style={{ minWidth: 32 }}
                                        >
                                            {deletingRoleId === role.id ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faTrash} />}
                                        </span>
                                    </td> */}
                                </tr>
                            )) : (
                                <tr><td colSpan="6" style={{ textAlign: 'center' }}>No roles found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
