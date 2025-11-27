import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import api from "../services/api";
import "./Auth.css";

function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await api.post("/api/auth/login", { email, password });

            // axios puts data in res.data (no res.json(), no res.ok)
            const { role, userUsername, userId, userEmail } = res.data;
            localStorage.setItem("role", JSON.stringify(role));
            localStorage.setItem("username", userUsername);
            localStorage.setItem("userId", userId);
            // localStorage.setItem("userEmail", userEmail);

            alert("Login Successful!");
            navigate("/dashboard");
        } catch (err) {
            console.error("Login error:", err);
            const errorMsg =
                err.response?.data?.error || "Login failed. Please try again.";
            alert(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-left">
                <div className="logo-section">
                    <img src="/Bot.png" alt="Ecosort Logo" className="logo" />
                    <h2>Ecosort Bot</h2>
                </div>
            </div>

            <div className="auth-right">
                <form className="auth-form" onSubmit={handleLogin}>
                    <h2 className="form-title">Login</h2>

                    <input
                        type="email"
                        placeholder="Enter Your Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <div className="password-field">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter Your Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <span
                            className="eye-icon"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </span>
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? "Logging in..." : "Login"}
                    </button>

                    <p className="forgot-password">
                        <a href="/reset-password">Forgot Password?</a>
                    </p>

                    <p className="signup-text">
                        Not registered yet?{" "}
                        <a href="/signup" className="signup-link">
                            Sign up here!
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default LoginPage;
