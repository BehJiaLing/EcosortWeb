import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
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
            // const response = await fetch("http://172.20.10.3:5000/api/auth/login", {
            //     method: "POST",
            //     headers: { "Content-Type": "application/json" },
            //     body: JSON.stringify({ email, password }),
            // });

            const response = await fetch("http://localhost:5000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            // const API_BASE = "https://b44809ef6990.ngrok-free.app";

            // const response = await fetch(`${API_BASE}/api/auth/login`, {
            //     method: "POST",
            //     headers: { "Content-Type": "application/json" },
            //     body: JSON.stringify({ email, password }),
            // });

            const data = await response.json();

            if (response.ok) {
                // save token + user data
                // console.log("Login successful:", response, data);
                localStorage.setItem("token", data.token);
                localStorage.setItem("role", JSON.stringify(data.role));
                localStorage.setItem("username", data.userUsername);

                alert("Login Successful!");
                navigate("/dashboard");
            } else {
                alert(data.error || "Login failed. Please try again.");
            }
        } catch (err) {
            console.error(err);
            alert("Server error. Please try again later.");
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
                        <a href="/reset-password">
                            Forgot Password?
                        </a>
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
