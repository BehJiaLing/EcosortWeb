import React, { useState } from "react";
import "./Auth.css";

function ResetPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("http://localhost:5000/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (res.ok) {
                alert(data.message);
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert("Something went wrong.");
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
