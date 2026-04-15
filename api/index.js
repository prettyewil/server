/**
 * Vercel serverless entry for the Express API (backend lives under `server/`).
 * Local dev: run `npm run dev` from `server/` (see server.js).
 */

const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const serverless = require('serverless-http');
const { connectDB } = require('../db');
const app = require('../app');

let handler;

module.exports = async (req, res) => {
    try {
        await connectDB();
        if (!handler) {
            handler = serverless(app);
        }
        return handler(req, res);
    } catch (err) {
        console.error('API bootstrap error:', err);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Server initialization failed' });
        }
    }
};
