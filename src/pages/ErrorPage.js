// src/pages/ErrorPage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ErrorPage.css';

export default function ErrorPage() {
    const navigate = useNavigate();

    return (
        <div className="error-container">
            <h1>401 - Unauthorized</h1>
            <p>You do not have permission to access this page.</p>
            <button className="back-btn" onClick={() => navigate('/')}>
                Go to Login
            </button>
        </div>
    );
}
