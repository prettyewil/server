const mongoose = require('mongoose');

/**
 * Reuses the Mongoose connection across serverless invocations (Vercel).
 * Safe for a long-running local `node server.js` process as well.
 */
async function connectDB() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error('MONGO_URI is not defined');
    }

    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (mongoose.connection.readyState === 2) {
        return mongoose.connection.asPromise();
    }

    // Log the URI (masking password) for debugging
    const maskedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '// $1:***@');
    console.log(`[Database] Connecting to: ${maskedUri}`);

    await mongoose.connect(uri, {
        family: 4, // Force IPv4 to avoid some DNS issues
        serverSelectionTimeoutMS: 30000, // Wait up to 30s
    });
    return mongoose.connection;
}

module.exports = { connectDB };
