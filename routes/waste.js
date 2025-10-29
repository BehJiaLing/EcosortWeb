module.exports = (db) => {
    const express = require("express");
    const router = express.Router();
    const authMiddleware = require("../middleware/authMiddleware");

    // Get latest waste logs (public)
    router.get('/', async (req, res) => {
        try {
            const snap = await db.collection('waste_data').orderBy('timestamp', 'desc').get();
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            res.json(items);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Add new waste log (device or user)
    // router.post('/', async (req, res) => {
    //     try {
    //         const payload = req.body;
    //         payload.timestamp = payload.timestamp || new Date().toISOString();
    //         const ref = await db.collection('waste_data').add(payload);
    //         res.status(201).json({ id: ref.id, message: 'Added' });
    //     } catch (err) {
    //         res.status(500).json({ error: err.message });
    //     }
    // });

    // Soft delete waste logs by date (YYYY-MM-DD)
    router.delete("/by-date/:date", authMiddleware, async (req, res) => {
        try {
            const { date } = req.params;
            const actor = req.user?.id || "Unknown User";

            const snap = await db.collection("waste_data")
                .where("timestamp", ">=", `${date} 00:00:00`)
                .where("timestamp", "<=", `${date} 23:59:59`)
                .get();

            if (snap.empty) {
                return res.status(404).json({ error: "No logs found for this date" });
            }

            const now = new Date().toISOString();
            const batch = db.batch();

            let total = 0;
            let alreadyDeleted = 0;
            let newlyDeleted = 0;

            snap.docs.forEach(doc => {
                total++;
                const data = doc.data() || {};
                if (data.deleted === true) {
                    alreadyDeleted++;
                    return;
                }
                newlyDeleted++;
                batch.update(doc.ref, {
                    deleted: true,
                    deletedAt: now,
                    deletedBy: actor,
                });
            });

            if (newlyDeleted > 0) {
                await batch.commit();
            }

            return res.json({
                message: `Matched ${total}. Newly marked deleted: ${newlyDeleted}. Already deleted: ${alreadyDeleted}.`,
                stats: { total, newlyDeleted, alreadyDeleted, actor, date }
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }
    });

    // Soft delete a single waste log by ID
    router.delete("/:id", authMiddleware, async (req, res) => {
        try {
            const { id } = req.params;
            const actor = req.user?.id || "Unknown User";

            const ref = db.collection("waste_data").doc(id);
            const snap = await ref.get();
            if (!snap.exists) return res.status(404).json({ error: "Waste log not found" });

            const data = snap.data() || {};
            if (data.deleted === true) {
                return res.status(409).json({
                    error: "Waste log already deleted",
                    deletedAt: data.deletedAt || null,
                    deletedBy: data.deletedBy || null,
                });
            }

            await ref.update({
                deleted: true,
                deletedAt: new Date().toISOString(),
                deletedBy: actor,
            });

            return res.json({ message: `Waste log marked as deleted by ${actor}` });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }
    });

    // 🔹 Get waste summary (all users)
    router.get('/summary', authMiddleware, async (req, res) => {
        try {
            const snap = await db.collection('waste_data').get();

            let totalRecyclable = 0;
            let totalNonRecyclable = 0;

            snap.forEach(doc => {
                const { prediction, deleted } = doc.data() || {};

                // Skip soft-deleted logs
                if (deleted === true) return;

                if (prediction === "Recyclable") totalRecyclable++;
                else if (prediction === "Non-Recyclable") totalNonRecyclable++;
            });

            res.json({ totalRecyclable, totalNonRecyclable });
        } catch (err) {
            console.error("Waste summary error:", err);
            res.status(500).json({ error: "Failed to fetch waste summary" });
        }
    });


    // 🔹 Get current user's waste logs
    // router.get('/user', authMiddleware, async (req, res) => {
    //     try {
    //         const userEmail = req.user.email; // from JWT in authMiddleware
    //         const snap = await db.collection('waste_data')
    //             .where('userEmail', '==', userEmail) // make sure you store email or userId in each waste_data
    //             .orderBy('timestamp', 'desc')
    //             .get();

    //         const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    //         res.json(logs);
    //     } catch (err) {
    //         console.error("User waste logs error:", err);
    //         res.status(500).json({ error: "Failed to fetch user waste logs" });
    //     }
    // });

    // 🔹 Get ALL waste logs (with username instead of userId)
    router.get('/all', authMiddleware, async (req, res) => {
        try {
            const snap = await db.collection('waste_data')
                .orderBy('timestamp', 'desc')
                .get();

            // Filter out soft-deleted first to avoid unnecessary lookups
            const activeDocs = snap.docs.filter(d => {
                const data = d.data() || {};
                return data.deleted !== true; // only keep non-deleted
            });

            const logs = await Promise.all(
                activeDocs.map(async (d) => {
                    const data = d.data() || {};
                    const wasteId = d.id;

                    // Default username
                    let username = "Nobody Claimed";

                    // If points === 0, mark as not claimable and skip history lookup
                    if (data.points === 0) {
                        username = "Not Claimable";
                    } else {
                        // Try to find matching waste_history for this wasteId
                        const historySnap = await db.collection('waste_history')
                            .where('wasteId', '==', wasteId)
                            .limit(1)
                            .get();

                        if (!historySnap.empty) {
                            const historyData = historySnap.docs[0].data() || {};
                            const userId = historyData.userId;

                            if (userId) {
                                // Lookup username from users collection
                                const userDoc = await db.collection('users').doc(userId).get();
                                if (userDoc.exists) {
                                    username = userDoc.data()?.username || "Nobody Claimed";
                                }
                            }
                        }
                    }

                    return {
                        id: wasteId,
                        wasteId,
                        collectedAt: data.timestamp || null,
                        prediction: data.prediction || null,
                        waste_class: data.waste_class || null,
                        pointsCollected: data.points ?? null,
                        username,
                    };
                })
            );

            res.json(logs);
        } catch (err) {
            console.error("All waste logs error:", err);
            res.status(500).json({ error: "Failed to fetch all waste logs" });
        }
    });

    // 🔹 Get user history table records
    router.get("/user-history", authMiddleware, async (req, res) => {
        try {
            const userId = req.user.id;

            const historySnap = await db
                .collection("waste_history")
                .where("userId", "==", userId)
                .get();

            if (historySnap.empty) return res.json([]);

            // fetch all waste data concurrently
            const historyData = await Promise.all(
                historySnap.docs.map(async (doc) => {
                    const record = doc.data();
                    const wasteId = record.wasteId;

                    if (!wasteId) return null;

                    // const wasteSnap = await db.collection("waste_data").doc(wasteId).get();
                    // if (!wasteSnap.exists) return null;

                    // const waste = wasteSnap.data();

                    return {
                        id: doc.id,
                        wasteId,
                        waste_class: record.waste_class || "Unknown",
                        collectedAt: record.collectedAt.toDate().toISOString(),
                        // prediction: waste.prediction,
                        pointsCollected: record.pointsCollected,
                    };
                })
            );

            // filter out nulls
            res.json(historyData.filter((item) => item !== null));
        } catch (err) {
            console.error("Failed to get user history:", err);
            res.status(500).json({ error: "Failed to fetch user history" });
        }
    });

    router.get("/deleted", authMiddleware, async (req, res) => {
        try {
            const { dateFrom, dateTo, user } = req.query;
            let q = db.collection("waste_data").where("deleted", "==", true);

            // Optional date range filter (by deletedAt)
            if (dateFrom) q = q.where("deletedAt", ">=", `${dateFrom}T00:00:00.000Z`);
            if (dateTo) q = q.where("deletedAt", "<=", `${dateTo}T23:59:59.999Z`);

            // Optional deletedBy filter
            if (user) q = q.where("deletedBy", "==", user);

            const snap = await q.get();
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Sort newest first by deletedAt (fallback to timestamp)
            items.sort((a, b) => new Date(b.deletedAt || b.timestamp || 0) - new Date(a.deletedAt || a.timestamp || 0));
            res.json(items);
        } catch (err) {
            console.error("GET /deleted error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    router.patch("/:id/restore", authMiddleware, async (req, res) => {
        try {
            const { id } = req.params;
            const docRef = db.collection("waste_data").doc(id);
            const snap = await docRef.get();
            if (!snap.exists) return res.status(404).json({ error: "Waste log not found" });

            const restoredBy = req.user?.id || "Unknown User";
            const now = new Date().toISOString();

            await docRef.update({
                deleted: false,
                restoredAt: now,
                restoredBy
            });

            res.json({ message: `Waste log restored by ${restoredBy}` });
        } catch (err) {
            console.error("PATCH /restore error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
