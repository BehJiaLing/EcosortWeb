import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa"; 
import "./Auth.css";
import api from "../services/api";

function SignupPage() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false); 

    const handleSignup = async (e) => {
        e.preventDefault();

        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        if (!passwordRegex.test(password)) {
            alert(
                "Password must be at least 8 characters long, include uppercase, lowercase, number, and special character."
            );
            return;
        }
        
        setLoading(true);
        try {
            const res = await api.post("/api/auth/signup", {
                username,
                email,
                password,
            });

            alert(res.data?.message || "Signup successful! Please check your email.");
            navigate("/login");

            // clear inputs
            setUsername("");
            setEmail("");
            setPassword("");
            setConfirmPassword("");
        } catch (err) {
            console.error("Signup error:", err);
            const msg = err.response?.data?.error || "Server error. Please try again later.";
            alert(msg);
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
                <form className="auth-form" onSubmit={handleSignup}>
                    <h2 className="form-title">Create Your Account</h2>

                    <input
                        type="username"
                        placeholder="Enter Your Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />

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

                    {/* Confirm Password with eye toggle */}
                    <div className="password-field">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm Your Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                        <span
                            className="eye-icon"
                            onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                            }
                        >
                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                        </span>
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? "Signing Up..." : "Sign Up"}
                    </button>

                    <p className="signup-text">
                        Already have an account?{" "}
                        <a href="/login" className="signup-link">
                            Login here!
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default SignupPage;
