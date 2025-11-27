import React, { useState } from "react";
import "./Auth.css";
import api from "../services/api"; 

function ResetPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await api.post("/api/auth/reset-password", { email });
            alert(res.data?.message || "Reset email sent (if account exists).");
        } catch (err) {
            console.error("Reset password error:", err);
            const msg = err.response?.data?.error || "Something went wrong.";
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            {/* Left side logo */}
            <div className="auth-left">
                <div className="logo-section">
                    <img src="/Bot.png" alt="Ecosort Logo" className="logo" />
                    <h2>Ecosort Bot</h2>
                </div>
            </div>

            {/* Right side form */}
            <div className="auth-right">
                <form className="auth-form" onSubmit={handleReset}>
                    <h2 className="form-title">Reset Password</h2>

                    <input
                        type="email"
                        placeholder="Enter Your Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? "Sending..." : "Send Reset Link"}
                    </button>

                    {message && <p className="form-message">{message}</p>}

                    <p className="signup-text">
                        Remembered your password?{" "}
                        <a href="/login" className="signup-link">
                            Login here!
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default ResetPassword;
