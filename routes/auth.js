const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const authMiddleware = require("../middleware/authMiddleware");

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

module.exports = (db) => {
    const router = express.Router();

    // 🔹 Signup route
    router.post('/signup', async (req, res) => {
        try {
            const { username, email, password } = req.body;
            if (!username || !email || !password) {
                return res.status(400).json({ error: 'Username + Email + password are required' });
            }

            const lowerEmail = email.toLowerCase();

            // 🔸 Check if user already exists
            const userRef = db.collection('users').doc(lowerEmail);
            const userDoc = await userRef.get();
            if (userDoc.exists) {
                return res.status(400).json({ error: 'User already exists' });
            }

            // 🔸 Determine role by email domain
            let roleId = "";
            const domain = lowerEmail.split("@")[1];

            if (domain === "student.newinti.edu.my") {
                roleId = "YnEt3wtlZpDFL2N6EHoH"; // Student
            } else if (domain === "newinti.edu.my") {
                roleId = "mfPFOoUlvIuMgmjHova3"; // Lecturer
            } else if (domain === "ecosort.com") {
                roleId = "tVyg7N1TvIJrJK0VLGTI"; // Admin
            } else {
                return res.status(400).json({ error: "Invalid email domain — not allowed to register." });
            }

            // 🔸 Hash password
            const hashed = await bcrypt.hash(password, 10);

            // 🔸 Step 1: Save user (email as doc ID)
            await userRef.set({
                username,
                email: lowerEmail,
                password: hashed,
                role: roleId,
                phone: "",
                points: 0,
                verified: false,
                createdAt: new Date()
            });

            // Save user (email not as doc ID)
            // const userRef = await db.collection('users').add({ username, email, password: hashed, role: roleId, phone: "", points: 0, verified: false, createdAt: new Date() });

            // 🔸 Step 2: Generate JWT token with email
            const token = jwt.sign({ email: lowerEmail }, JWT_SECRET, { expiresIn: '1d' });
            const verifyUrl = `http://localhost:5000/api/auth/verify/${token}`;

            // 🔸 Step 3: Send verification email
            const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: EMAIL_USER,
                    pass: EMAIL_PASS
                }
            });

            const mailOptions = {
                from: `"Ecosort Bot" <${EMAIL_USER}>`,
                to: lowerEmail,
                subject: 'Verify your Ecosort account',
                html: `
                <h3>Welcome to Ecosort Bot!</h3>
                <p>Please click the link below to verify your account:</p>
                <a href="${verifyUrl}" target="_blank">Verify Account</a>
                <p>This link will expire in 24 hours.</p>
            `
            };

            await transporter.sendMail(mailOptions);

            return res.status(201).json({
                message: 'Signup successful! Please check your email to verify your account.'
            });

        } catch (err) {
            console.error("Signup error:", err);
            return res.status(500).json({
                error: `Account created, but verification email could not be sent: ${err.message}`
            });
        }
    });

    // 🔹 Verify email route
    router.get('/verify/:token', async (req, res) => {
        try {
            const { token } = req.params;
            const decoded = jwt.verify(token, JWT_SECRET);
            const email = decoded.email.toLowerCase();

            const userRef = db.collection('users').doc(email);
            //const userRef = db.collection('users').doc(decoded.id);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                return res.status(400).send('Invalid verification link');
            }

            await userRef.update({ verified: true });
            return res.send('✅ Email verified! You can now log in.');

        } catch (err) {
            console.error("Verification error:", err);
            res.status(400).send('❌ Invalid or expired verification link.');
        }
    });

    // 🔹 Login route
    router.post('/login', async (req, res) => {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: 'Email + password required' });
            }

            // 🔸 Step 1: Fetch user by email (email is document ID)
            const userRef = db.collection('users').doc(email);
            const doc = await userRef.get();

            if (!doc.exists) {
                return res.status(400).json({ error: 'Email not found' });
            }

            const user = doc.data();

            // Fetch user by email (email is not document ID)
            //const snapshot = await db.collection('users').where('email', '==', email).get(); if (snapshot.empty) { return res.status(400).json({ error: 'Email not found' }); } const doc = snapshot.docs[0]; const user = doc.data();

            // 🔸 Step 2: Check if verified
            if (!user.verified) {
                return res.status(403).json({ error: 'Please verify your email before logging in.' });
            }

            // 🔸 Step 3: Compare password
            const ok = await bcrypt.compare(password, user.password);
            if (!ok) {
                return res.status(400).json({ error: 'Incorrect password' });
            }

            // 🔸 Step 4: Generate JWT token
            const payload = { id: doc.id, email: user.email, role: user.role };
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '60m' });
            const isProd = process.env.NODE_ENV === 'production';
            res.cookie("token", token, {
                httpOnly: true,                    
                secure: isProd,                    
                sameSite: "lax",                   
                maxAge: 60 * 60 * 1000,    
                path: "/",
            });

            // 🔸 Step 5: Respond
            return res.json({
                userId: doc.id,
                userEmail: user.email,
                role: user.role,
                userUsername: user.username
            });

        } catch (err) {
            console.error("Login error:", err);
            res.status(500).json({ error: err.message || "Login failed" });
        }
    });

    // 🔹 Request password reset
    router.post('/reset-password', async (req, res) => {
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ error: "Email required" });

            const snapshot = await db.collection('users').where('email', '==', email).get();
            if (snapshot.empty) return res.status(404).json({ error: "User not found" });

            const doc = snapshot.docs[0];
            const userRef = doc.ref;

            // generate reset token (JWT)
            const token = jwt.sign({ id: doc.id, email }, JWT_SECRET, { expiresIn: '1h' });
            const resetUrl = `${CLIENT_URL}/new-password?token=${token}&email=${encodeURIComponent(email)}`;

            await userRef.update({
                resetToken: token,
                resetExpires: Date.now() + 60 * 60 * 1000
            });

            const transporter = nodemailer.createTransport({
                service: 'Gmail',
                auth: { user: EMAIL_USER, pass: EMAIL_PASS }
            });

            await transporter.sendMail({
                to: email,
                subject: 'EcoSort - Reset your password',
                html: `<h3>Password Reset Request</h3>
                   <p>Click the link below to reset your password:</p>
                   <a href="${resetUrl}" target="_blank">Reset Password</a>
                   <p>This link will expire in 1 hour.</p>`
            });

            res.json({ message: "Password reset link sent to your email." });

        } catch (err) {
            console.error("Reset password error:", err);
            res.status(500).json({ error: "Failed to send reset email" });
        }
    });

    // 🔹 Set new password
    router.post('/new-password', async (req, res) => {
        try {
            const { email, token, newPassword } = req.body;
            if (!email || !token || !newPassword) {
                return res.status(400).json({ error: "Missing fields" });
            }

            const snapshot = await db.collection('users').where('email', '==', email).get();
            if (snapshot.empty) return res.status(404).json({ error: "User not found" });

            const doc = snapshot.docs[0];
            const user = doc.data();
            const userRef = doc.ref;

            if (user.resetToken !== token || Date.now() > user.resetExpires) {
                return res.status(400).json({ error: "Invalid or expired reset token" });
            }

            const hashed = await bcrypt.hash(newPassword, 10);

            await userRef.update({
                password: hashed,
                resetToken: null,
                resetExpires: null
            });

            res.json({ message: "Password has been reset successfully." });

        } catch (err) {
            console.error("New password error:", err);
            res.status(500).json({ error: "Failed to reset password" });
        }
    });

    // get profile
    router.get("/me", authMiddleware, async (req, res) => {
        try {
            const userRef = db.collection("users").doc(req.user.id);
            const userSnap = await userRef.get();

            if (!userSnap.exists) {
                return res.status(404).json({ error: "User not found" });
            }

            const userData = userSnap.data();
            res.json({ id: userSnap.id, ...userData });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // check token
    router.get("/meAccess", authMiddleware, (req, res) => {
        // req.user comes from JWT: { id, email, role }
        res.json({ user: req.user });
    });

    // request password reset with current password
    // router.post("/request-password-reset", authMiddleware, async (req, res) => {
    //     try {
    //         const { email, password } = req.body;

    //         if (!email || !password) {
    //             return res.status(400).json({ error: "Email and password required" });
    //         }

    //         // 🔍 Find user in Firestore
    //         const userSnap = await db.collection("users")
    //             .where("email", "==", email)
    //             .limit(1)
    //             .get();

    //         if (userSnap.empty) {
    //             return res.status(404).json({ error: "User not found" });
    //         }

    //         const userDoc = userSnap.docs[0];
    //         const userData = userDoc.data();

    //         // 🔑 Check current password
    //         const isMatch = await bcrypt.compare(password, userData.password);
    //         if (!isMatch) {
    //             return res.status(400).json({ error: "Incorrect password" });
    //         }

    //         // 🔒 Create reset token (expires in 15 minutes)
    //         const resetToken = jwt.sign(
    //             { id: userDoc.id, email: userData.email },
    //             process.env.JWT_SECRET,
    //             { expiresIn: "15m" }
    //         );

    //         const resetUrl = `${CLIENT_URL}/request-change-password?token=${resetToken}`;

    //         // 📧 Send reset email
    //         const transporter = nodemailer.createTransport({
    //             service: "Gmail",
    //             auth: {
    //                 user: process.env.EMAIL_USER,
    //                 pass: process.env.EMAIL_PASS,
    //             },
    //         });

    //         await transporter.sendMail({
    //             from: `"EcoSort Bot" <${process.env.EMAIL_USER}>`,
    //             to: userData.email,
    //             subject: "Password Reset Request",
    //             html: `
    //             <p>Hello ${userData.email},</p>
    //             <p>You requested to reset your password. Click the link below:</p>
    //             <a href="${resetUrl}">${resetUrl}</a>
    //             <p>This link will expire in 15 minutes.</p>
    //         `,
    //         });

    //         res.json({ message: "Password reset email sent" });

    //     } catch (err) {
    //         console.error("Error in request-password-reset:", err);
    //         res.status(500).json({ error: "Server error" });
    //     }
    // });

    // 🔹 Verify current password (for password reveal in profile)
    router.post("/verify-password", authMiddleware, async (req, res) => {
        try {
            const { password } = req.body;
            if (!password) {
                return res.status(400).json({ success: false, error: "Password required" });
            }

            const userRef = db.collection("users").doc(req.user.id);
            const userSnap = await userRef.get();
            if (!userSnap.exists) {
                return res.status(404).json({ success: false, error: "User not found" });
            }

            const userData = userSnap.data();
            const isMatch = await bcrypt.compare(password, userData.password);
            if (!isMatch) {
                return res.status(400).json({ success: false, error: "Incorrect password" });
            }

            return res.json({ success: true });
        } catch (err) {
            console.error("Error verifying password:", err);
            res.status(500).json({ success: false, error: "Server error" });
        }
    });

    // 🔹 Update phone number
    router.put("/update-phone", authMiddleware, async (req, res) => {
        try {
            const { phone } = req.body;
            if (!phone) {
                return res.status(400).json({ success: false, error: "Phone number required" });
            }

            const userRef = db.collection("users").doc(req.user.id);
            const userSnap = await userRef.get();
            if (!userSnap.exists) {
                return res.status(404).json({ success: false, error: "User not found" });
            }

            await userRef.update({ phone });

            return res.json({ success: true, phone });
        } catch (err) {
            console.error("Error updating phone:", err);
            res.status(500).json({ success: false, error: "Server error" });
        }
    });

    // Update username
    router.put("/update-username", authMiddleware, async (req, res) => {
        try {
            const userId = req.user.id;
            const { username } = req.body;

            if (!username || username.trim() === "") {
                return res.status(400).json({ error: "Username is required" });
            }

            // Optional: check if username already exists
            const snap = await db.collection("users").where("username", "==", username).get();
            if (!snap.empty) {
                return res.status(400).json({ error: "Username already taken" });
            }

            const userRef = db.collection("users").doc(userId);
            await userRef.update({ username });

            res.json({ success: true, username });
        } catch (err) {
            console.error("Error updating username:", err);
            res.status(500).json({ error: "Failed to update username" });
        }
    });

    router.post("/logout", (req, res) => {
        const isProd = process.env.NODE_ENV === "production";

        res.clearCookie("token", {
            httpOnly: true,
            secure: isProd,
            sameSite: "lax",
        });

        res.json({ message: "Logged out" });
    });


    return router;
};
