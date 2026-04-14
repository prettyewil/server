const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const { connectDB } = require('./db');
const app = require('./app');
const { scheduleBackups } = require('./services/backupService');
const { scheduleJobs } = require('./services/cronService');

console.log('Attempting to connect to MongoDB...');

connectDB()
    .then(() => {
        console.log('MongoDB Connected successfully');

        if (!process.env.VERCEL) {
            scheduleBackups();
            scheduleJobs();
        } else {
            console.log('[Server] Skipping in-process cron/backup schedules on Vercel (no persistent process).');
        }

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('MongoDB Connection Error on startup:', err);
        process.exit(1);
    });
