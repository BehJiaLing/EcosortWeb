// routes/access.js
module.exports = (db) => {
    const express = require('express');
    const router = express.Router();

    // Get all roles
    router.get('/roles', async (req, res) => {
        try {
            const snap = await db.collection('Roles').get();
            const roles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            res.json(roles);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Add new role
    router.post('/roles', async (req, res) => {
        try {
            const { roleName } = req.body;
            const ref = await db.collection('Roles').add({ roleName, accessiblePages: [] });
            res.status(201).json({ id: ref.id, message: 'Role added' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Update role name
    router.put('/roles/:id', async (req, res) => {
        try {
            const { roleName } = req.body;
            const ref = db.collection('Roles').doc(req.params.id);
            await ref.update({ roleName });
            res.json({ message: 'Role updated' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Update role page access
    router.put('/roles/:id/pages', async (req, res) => {
        try {
            const { pages } = req.body; // array of page IDs
            const ref = db.collection('Roles').doc(req.params.id);
            await ref.update({ accessiblePages: pages });
            res.json({ message: 'Role pages updated' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Get accessible pages for a role
    router.get('/roles/:id/pages', async (req, res) => {
        try {
            const roleRef = db.collection('Roles').doc(req.params.id);
            const roleDoc = await roleRef.get();

            if (!roleDoc.exists) {
                return res.status(404).json({ error: 'Role not found' });
            }

            const roleData = roleDoc.data();
            res.json({ pages: roleData.accessiblePages || [] });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Get all pages
    router.get('/pages', async (req, res) => {
        try {
            const snap = await db.collection('Pages').get();
            const pages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            res.json(pages);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Delete a role by ID
    router.delete('/roles/:id', async (req, res) => {
        try {
            const roleRef = db.collection('Roles').doc(req.params.id);
            const docSnap = await roleRef.get();

            if (!docSnap.exists) {
                return res.status(404).json({ error: 'Role not found' });
            }

            await roleRef.delete();
            res.json({ message: 'Role deleted successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/roles/:id/users', async (req, res) => {
        try {
            const roleId = req.params.id;
            // return users whose `role` field equals the role doc id
            const snap = await db.collection('users').where('role', '==', roleId).get();
            const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            res.json(users);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- NEW: assign existing user (by email) to a role ---
    // router.post('/roles/:id/users', async (req, res) => {
    //     try {
    //         const roleId = req.params.id;
    //         const { email } = req.body;
    //         if (!email) return res.status(400).json({ error: 'Email required' });

    //         const userSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    //         if (userSnap.empty) return res.status(404).json({ error: 'User not found' });

    //         const userDoc = userSnap.docs[0];
    //         await userDoc.ref.update({ role: roleId });

    //         // return the updated user object
    //         const updated = (await userDoc.ref.get()).data();
    //         res.json({ message: 'User assigned to role', user: { id: userDoc.id, ...updated } });
    //     } catch (err) {
    //         res.status(500).json({ error: err.message });
    //     }
    // });

    // --- NEW: remove user from role (set role to default 'user' role id if exists, else null) ---
    router.delete('/roles/:id/users/:userId', async (req, res) => {
        try {
            const roleId = req.params.id;
            const { userId } = req.params;

            const userRef = db.collection('users').doc(userId);
            const userSnap = await userRef.get();
            if (!userSnap.exists) return res.status(404).json({ error: 'User not found' });

            const roleRef = db.collection('Roles').doc(roleId);
            const roleSnap = await roleRef.get();
            if (!roleSnap.exists) return res.status(404).json({ error: 'Role not found' });

            const roleData = roleSnap.data();

            if (roleData.roleName.toLowerCase() === 'user') {
                // Case 1: If role = "User" → permanently delete user
                await userRef.delete();
                return res.json({ message: 'User deleted permanently' });
            } else {
                // Case 2: Any other role → reassign to default 'User' role
                const defaultRoleSnap = await db.collection('Roles')
                    .where('roleName', '==', 'User')
                    .limit(1)
                    .get();

                if (defaultRoleSnap.empty) {
                    return res.status(400).json({ error: "Default 'User' role not found" });
                }

                const defaultRoleId = defaultRoleSnap.docs[0].id;
                await userRef.update({ role: defaultRoleId });

                return res.json({ message: 'User moved back to User role', newRoleId: defaultRoleId });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/roles/:id', async (req, res) => {
        try {
            const roleRef = db.collection('Roles').doc(req.params.id);
            const roleDoc = await roleRef.get();

            if (!roleDoc.exists) {
                return res.status(404).json({ error: "Role not found" });
            }

            res.json({ id: roleDoc.id, ...roleDoc.data() });
        } catch (err) {
            console.error("Failed to fetch role:", err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
