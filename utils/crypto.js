const { Fernet } = require('fernet-nodejs');

const FERNET_KEY = process.env.ECOSORT_SECRET_KEY;

if (!FERNET_KEY) {
    console.error("❌ ECOSORT_SECRET_KEY is not set in environment");
    throw new Error("Missing ECOSORT_SECRET_KEY");
}

// Decrypt a single Fernet token (string) from Firestore
function decryptField(token) {
    if (!token) return null;
    try {
        return Fernet.decrypt(token, FERNET_KEY);
    } catch (err) {
        console.error("Failed to decrypt field:", err.message);
        return null;     
    }
}

// (optional) Encrypt helper
function encryptField(value) {
    if (value == null) return null;
    try {
        return Fernet.encrypt(value.toString(), FERNET_KEY);
    } catch (err) {
        console.error("Failed to encrypt field:", err.message);
        return null;
    }
}

module.exports = {
    decryptField,
    encryptField,
};
