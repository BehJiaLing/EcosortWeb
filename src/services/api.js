// import axios from 'axios';

// const api = axios.create({
//     // baseURL: 'https://b44809ef6990.ngrok-free.app', 
//     baseURL: 'http://localhost:5000', 
//     headers: {
//         'Content-Type': 'application/json',
//     },
// });

// // attach token if present
// api.interceptors.request.use(config => {
//     const token = localStorage.getItem('token');
//     if (token) config.headers.Authorization = `Bearer ${token}`;
//     return config;
// });

// export default api;

import axios from "axios";

const api = axios.create({
    // baseURL: "https://b44809ef6990.ngrok-free.app",
    baseURL: "http://localhost:5000",
    headers: {
        "Content-Type": "application/json",
    },
});

// Attach token automatically (safe + consistent)
api.interceptors.request.use((config) => {
    let token = localStorage.getItem("token");

    // 🧹 Strip accidental quotes if saved via JSON.stringify
    if (token && token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1);
    }

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    } else {
        console.warn("⚠️ No auth token found in localStorage");
    }

    return config;
});

// Optional: auto-logout or alert if token expired/invalid
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            console.warn("🔒 Token invalid or expired. Logging out...");
            localStorage.removeItem("token");
            // window.location.href = "/login"; // uncomment if you want auto-redirect
        }
        return Promise.reject(error);
    }
);

export default api;
