const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
    let token = req.cookies?.token;

    // if (!token) {
    //     const authHeader = req.header("Authorization");
    //     if (authHeader?.startsWith("Bearer ")) {
    //         token = authHeader.replace("Bearer ", "");
    //     }
    // }

    if (!token) {
        return res.status(401).json({ error: "No token, authorization denied" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id: ... }
        next();
    } catch (err) {
        console.error("JWT verify error:", err.message);
        return res.status(401).json({ error: "Token is not valid" });
    }
};
