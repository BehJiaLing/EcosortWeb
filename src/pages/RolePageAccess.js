import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faSave } from '@fortawesome/free-solid-svg-icons';
import './Access.css';
import './WasteLog.css';

export default function RolePageAccess({ role, onClose, refreshRoles, refreshSidebar }) {
    const [pages, setPages] = useState([]);
    const [selectedPages, setSelectedPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchPages = async () => {
            try {
                const res = await api.get('/api/access/pages');
                setPages(res.data);

                const accessible = Array.isArray(role.accessiblePages) ? role.accessiblePages : [];
                setSelectedPages(accessible);
            } catch (err) {
                console.error(err);
                alert('Error fetching pages');
            } finally {
                setLoading(false);
            }
        };
        fetchPages();
    }, [role]);

    const togglePage = (pageId) => {
        setSelectedPages(prev =>
            prev.includes(pageId)
                ? prev.filter(id => id !== pageId)
                : [...prev, pageId]
        );
    };

    const saveAccess = async () => {
        setSaving(true);
        try {
            await api.put(`/api/access/roles/${role.id}/pages`, { pages: selectedPages });
            alert('Access updated successfully');

            // Refresh sidebar in parent dashboard
            if (refreshSidebar) await refreshSidebar();
            // Refresh role list and close modal
            if (refreshRoles) refreshRoles();
            if (onClose) onClose();
        } catch (err) {
            console.error(err);
            alert(`Failed to update access: ${err.response?.data?.error || err.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="content-section">
            <div className="header-container">
                <h2>Page Access for "{role.roleName}"</h2>
                <button
                    className="save-btn"
                    onClick={saveAccess}
                    disabled={saving}
                    style={{ marginRight: 10 }}
                >
                    {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />} Save
                </button>
            </div>

            {loading ? (
                <div className="loading-section">
                    <FontAwesomeIcon icon={faSpinner} spin /> Loading pages...
                </div>
            ) : (
                <div className="table-container">
                    <table className="roles-table">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Page Name</th>
                                <th>Access</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pages.length ? (
                                pages.map((page, index) => (
                                    <tr key={page.id}>
                                        <td>{index + 1}</td>
                                        <td>{page.pageName || page.id}</td>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedPages.includes(page.pageName)}
                                                onChange={() => togglePage(page.pageName)}
                                            />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" style={{ textAlign: 'center' }}>No pages found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
