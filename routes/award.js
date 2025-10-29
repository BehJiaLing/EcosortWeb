module.exports = (db) => {
    const express = require("express");
    const authMiddleware = require("../middleware/authMiddleware");
    const router = express.Router();

    // list the users with points (optionally filtered by month)
    router.get("/users", async (req, res) => {
        try {
            const { month } = req.query;
            const allowedRoles = ["YnEt3wtlZpDFL2N6EHoH", "mfPFOoUlvIuMgmjHova3"]; 

            const usersSnapshot = await db
                .collection("users")
                .where("verified", "==", true)
                .where("role", "in", allowedRoles)
                .get();

            if (usersSnapshot.empty) return res.json([]);

            if (month) {
                const [year, monthNum] = month.split("-");
                const startDate = new Date(Number(year), Number(monthNum) - 1, 1);
                const endDate = new Date(Number(year), Number(monthNum), 1);

                const wasteSnapshot = await db
                    .collection("waste_history")
                    .where("collectedAt", ">=", startDate)
                    .where("collectedAt", "<", endDate)
                    .get();

                const userPoints = {};
                wasteSnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.userId) {
                        if (!userPoints[data.userId]) userPoints[data.userId] = 0;
                        userPoints[data.userId] += data.pointsCollected || 0;
                    }
                });

                const users = [];
                usersSnapshot.forEach((doc) => {
                    const data = doc.data();
                    users.push({
                        id: doc.id,
                        username: data.username || "-",
                        email: data.email || "-",
                        points: userPoints[doc.id] || 0,
                    });
                });

                users.sort((a, b) => b.points - a.points);
                return res.json(users);
            }

            const allTimeUsers = usersSnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    username: data.username || "-",
                    email: data.email || "-",
                    points: data.points || 0,
                };
            });

            allTimeUsers.sort((a, b) => b.points - a.points);
            res.json(allTimeUsers);
        } catch (err) {
            console.error("Error fetching award users:", err);
            res.status(500).json({ error: "Failed to fetch award users" });
        }
    });

    /* ----------------------------- USER AWARD ----------------------------- */

    // QR collect logic
    router.post("/collect", authMiddleware, async (req, res) => {
        try {
            const { wasteId } = req.body;
            const userId = req.user?.id;

            if (!userId) return res.status(401).json({ error: "Unauthorized" });
            if (!wasteId) return res.status(400).json({ error: "Waste ID is required" });

            const wasteRef = db.collection("waste_data").doc(wasteId);
            const wasteSnap = await wasteRef.get();
            if (!wasteSnap.exists) return res.status(404).json({ error: "Waste not found" });

            const waste = wasteSnap.data();
            if (waste.collected)
                return res.status(400).json({ error: "This QR code has already been scanned" });

            const points = waste.points || 0;

            await db.runTransaction(async (t) => {
                const userRef = db.collection("users").doc(userId);
                const userDoc = await t.get(userRef);
                const currentPoints = userDoc.data()?.points || 0;

                t.update(userRef, { points: currentPoints + points });
                t.update(wasteRef, { collected: true });

                const historyRef = db.collection("waste_history").doc();
                t.set(historyRef, {
                    userId,
                    wasteId,
                    waste_class: waste.waste_class,
                    collectedAt: new Date(),
                    pointsCollected: points,
                });
            });

            res.json({ message: "Waste collected successfully!", points });
        } catch (err) {
            console.error("Collect QR error:", err);
            res.status(500).json({ error: "Failed to collect waste" });
        }
    });

    // REDEEM award
    router.post("/redeem", authMiddleware, async (req, res) => {
        try {
            const { userId, awardId } = req.body;
            if (!userId || !awardId)
                return res.status(400).json({ error: "Missing userId or awardId" });

            const userRef = db.collection("users").doc(userId);
            const awardRef = db.collection("award").doc(awardId);

            const [userSnap, awardSnap] = await Promise.all([userRef.get(), awardRef.get()]);
            if (!userSnap.exists) return res.status(404).json({ error: "User not found" });
            if (!awardSnap.exists) return res.status(404).json({ error: "Award not found" });

            const user = userSnap.data();
            const award = awardSnap.data();
            const cost = Number(award.cost || 0);

            if ((user.points || 0) < cost)
                return res.status(400).json({ error: "Not enough points to redeem" });

            await db.runTransaction(async (t) => {
                const newBalance = (user.points || 0) - cost;
                t.update(userRef, { points: newBalance });

                const historyRef = db.collection("redeem_history").doc();
                t.set(historyRef, {
                    userId,
                    awardId,
                    redeemedAt: new Date(),
                    cost,
                    awardName: award.name,
                });
            });

            res.json({
                message: "Redeemed successfully",
                award,
                newBalance: (user.points || 0) - cost,
            });
        } catch (err) {
            console.error("Redeem award error:", err);
            res.status(500).json({ error: "Failed to redeem award" });
        }
    });

    /* ---------------------------- REDEEM and USER AWARD ---------------------------- */

    // GET all awards
    router.get("/catalog", async (req, res) => {
        try {
            const snapshot = await db.collection("award").get();
            const awards = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            res.json(awards);
        } catch (err) {
            console.error("Fetch award catalog error:", err);
            res.status(500).json({ error: "Failed to load award catalog" });
        }
    });

    /* ---------------------------- REDEEM ---------------------------- */

    // redeem-history
    router.get("/redeem-history", authMiddleware, async (req, res) => {
        try {
            const { userId, limit: lim } = req.query;

            let q = db.collection("redeem_history");

            if (userId) {
                // user-specific history
                q = q.where("userId", "==", userId).orderBy("redeemedAt", "desc");
            } else {
                // all users: just return latest N
                q = q.orderBy("redeemedAt", "desc").limit(Number(lim) || 200);
            }

            const snap = await q.get();

            const rows = snap.docs.map((doc) => {
                const data = doc.data();
                let redeemedAt = data.redeemedAt;
                if (redeemedAt?.toDate) {
                    redeemedAt = redeemedAt.toDate();
                }
                return {
                    id: doc.id,
                    ...data,
                    redeemedAt, // keep as Date for the client (optional)
                };
            });

            res.json(rows);
        } catch (err) {
            console.error("Fetch redeem history error:", err);
            // Firestore may require an index for where(userId) + orderBy(redeemedAt)
            // If you see an index error, visit the console link it prints to create one.
            res.status(500).json({ error: "Failed to load redeem history" });
        }
    });

    // Get single user's public award info (id, username, points)
    router.get("/user/:id", authMiddleware, async (req, res) => {
        try {
            const { id } = req.params;
            const snap = await db.collection("users").doc(id).get();
            if (!snap.exists) return res.status(404).json({ error: "User not found" });

            const data = snap.data();
            return res.json({
                id: snap.id,
                username: data.username || "-",
                points: data.points || 0,
            });
        } catch (err) {
            console.error("Fetch award user error:", err);
            res.status(500).json({ error: "Failed to load user info" });
        }
    });

    // ADD new award
    router.post("/add", authMiddleware, async (req, res) => {
        try {
            const { id, name, cost } = req.body;
            if (!name || !cost) return res.status(400).json({ error: "Missing name or cost" });

            const newAward = { name, cost: Number(cost), createdAt: new Date() };

            let ref;
            if (id) {
                ref = db.collection("award").doc(id);
                await ref.set(newAward);
            } else {
                ref = await db.collection("award").add(newAward);
            }

            res.json({ id: ref.id, ...newAward });
        } catch (err) {
            console.error("Add award error:", err);
            res.status(500).json({ error: "Failed to add award" });
        }
    });

    // EDIT award
    router.put("/:id", authMiddleware, async (req, res) => {
        try {
            const { id } = req.params;
            const { name, cost } = req.body;
            if (!name || !cost) return res.status(400).json({ error: "Missing name or cost" });

            await db.collection("award").doc(id).update({ name, cost: Number(cost) });
            res.json({ message: "Award updated successfully" });
        } catch (err) {
            console.error("Edit award error:", err);
            res.status(500).json({ error: "Failed to edit award" });
        }
    });

    // DELETE award
    router.delete("/:id", authMiddleware, async (req, res) => {
        try {
            const { id } = req.params;
            await db.collection("award").doc(id).delete();
            res.json({ message: "Award deleted successfully" });
        } catch (err) {
            console.error("Delete award error:", err);
            res.status(500).json({ error: "Failed to delete award" });
        }
    });

    return router;
};
