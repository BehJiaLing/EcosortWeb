import axios from "axios";

const api = axios.create({
    // baseURL: "https://b44809ef6990.ngrok-free.app",
    baseURL: "http://localhost:5000",
    withCredentials: true, 
    headers: {
        "Content-Type": "application/json",
    },
});

// Optional: handle 401 globally like redirect to login)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            console.warn("🔒 Not authenticated or session expired.");
            // Example: clear local UI state (but NOT cookie – backend handles that)
            // localStorage.clear();
            // window.location.href = "/login"; // uncomment if you want auto-redirect
        }
        return Promise.reject(error);
    }
);

export default api;
