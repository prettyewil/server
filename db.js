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

    await mongoose.connect(uri);
    return mongoose.connection;
}

module.exports = { connectDB };
