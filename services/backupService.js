const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Import Models
const User = require('../models/User');
const Payment = require('../models/Payment');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const Room = require('../models/Room');
const Announcement = require('../models/Announcement');
const AttendanceLog = require('../models/Attendance');
// Task model if it exists, otherwise skip or import dynamically
let Task;
try {
    Task = require('../models/Task');
} catch (e) {
    console.warn('Task model not found, skipping Task backup');
}

const backupDir = path.join(__dirname, '../backups');

const backupDatabase = async () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const specificBackupDir = path.join(backupDir, timestamp);

    try {
        if (!fs.existsSync(specificBackupDir)) {
            fs.mkdirSync(specificBackupDir, { recursive: true });
        }

        console.log(`[Backup] Starting backup at ${timestamp}...`);

        const collections = {
            users: User,
            payments: Payment,
            maintenance_requests: MaintenanceRequest,
            rooms: Room,
            announcements: Announcement,
            attendance_logs: AttendanceLog,
        };

        if (Task) collections.tasks = Task;

        for (const [name, model] of Object.entries(collections)) {
            const data = await model.find({});
            fs.writeFileSync(
                path.join(specificBackupDir, `${name}.json`),
                JSON.stringify(data, null, 2)
            );
            console.log(`[Backup] Backed up ${name}: ${data.length} records`);
        }

        console.log(`[Backup] Backup completed successfully at ${specificBackupDir}`);

        // Optional: Delete old backups (older than 7 days)
        cleanupOldBackups();

    } catch (error) {
        console.error('[Backup] Backup failed:', error);
    }
};

const cleanupOldBackups = () => {
    try {
        const files = fs.readdirSync(backupDir);
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        files.forEach(file => {
            const filePath = path.join(backupDir, file);
            const stats = fs.statSync(filePath);

            if (now - stats.mtime.getTime() > sevenDays) {
                if (stats.isDirectory()) {
                    fs.rmSync(filePath, { recursive: true, force: true });
                } else {
                    fs.unlinkSync(filePath);
                }
                console.log(`[Backup] Deleted old backup: ${file}`);
            }
        });
    } catch (error) {
        console.error('[Backup] Cleanup failed:', error);
    }
};

const scheduleBackups = () => {
    // Schedule task to run every 10 minutes
    cron.schedule('*/10 * * * *', () => {
        backupDatabase();
    });
    console.log('[Backup] Backup service scheduled (Every 10 minutes)');
};

module.exports = { scheduleBackups, backupDatabase };
