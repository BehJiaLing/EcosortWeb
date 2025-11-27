require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const admin = require('firebase-admin');
const path = require('path');
const cron = require('node-cron');
const cookieParser = require("cookie-parser");

// --- Initialize Firebase Admin ---
const serviceAccount = require('./firebase-key.json'); 
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: "http://localhost:3000",
        credentials: true,
    })
);
app.use(helmet());
app.use(morgan('dev'));
app.use('/api/auth', require('./routes/auth')(db));
app.use('/api/waste', require('./routes/waste')(db));
app.use('/api/access', require('./routes/access')(db));
app.use('/api/award', require('./routes/award')(db));

// --- Daily cleanup job (runs every day at 00:00 server time) ---
// cron.schedule('41 0 * * *', async () => {
//     try {
//         console.log("🧹 Running daily cleanup job...");

//         const DAYS = 3; // how many days before auto-deletion
//         const cutoff = new Date();
//         cutoff.setDate(cutoff.getDate() - DAYS);

//         const snapshot = await db.collection('users')
//             .where('verified', '==', false)
//             .where('createdAt', '<=', cutoff)
//             .get();

//         let deletedCount = 0;
//         const batch = db.batch();

//         snapshot.forEach(doc => {
//             batch.delete(doc.ref);
//             deletedCount++;
//         });

//         if (deletedCount > 0) {
//             await batch.commit();
//         }

//         console.log(`✅ Cleanup complete. Deleted ${deletedCount} unverified accounts.`);
//     } catch (err) {
//         console.error("❌ Cleanup job failed:", err);
//     }
// });

// --- Cleanup job: runs once on server start ---
async function cleanupUnverifiedUsers() {
    try {
        console.log("🧹 Running cleanup job on server start...");

        const DAYS = 3; 
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - DAYS);

        const snapshot = await db.collection('users')
            .where('verified', '==', false)
            .where('createdAt', '<=', cutoff)
            .get();

        let deletedCount = 0;
        const batch = db.batch();

        snapshot.forEach(doc => {
            batch.delete(doc.ref);
            deletedCount++;
        });

        if (deletedCount > 0) {
            await batch.commit();
        }

        console.log(`✅ Cleanup complete. Deleted ${deletedCount} unverified accounts.`);
    } catch (err) {
        console.error("❌ Cleanup job failed:", err);
    }
}

// Run cleanup immediately on server startup
// cleanupUnverifiedUsers();

// --- quick health check --- 
app.get('/api/health', (req, res) => res.json({ ok: true, message: 'EcoSort API running 🚀' }));

// --- Start server — use SERVER_PORT env var (set by scripts) or fallback to 5000 --- 
const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
