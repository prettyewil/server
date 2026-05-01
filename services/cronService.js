const cron = require('node-cron');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const emailService = require('./emailService');
const { logAction } = require('../utils/logger');
const { updateOverdueStatus } = require('../controllers/paymentController');
const { createNotification } = require('../controllers/notificationController');

// ==========================================
// 1. Attendance Reminder Logic
// ==========================================
const runAttendanceReminder = async () => {
    console.log('[Cron] Running Attendance Reminder...');
    try {
        const students = await User.find({ role: 'student', status: { $in: ['active', 'approved'] } });

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        let sentCount = 0;

        for (const student of students) {
            const attendance = await Attendance.findOne({
                student: student._id,
                date: { $gte: startOfDay, $lte: endOfDay }
            });

            if (!attendance) {
                await emailService.sendAttendanceReminder(student);
                console.log(`[Cron] Sent attendance reminder to ${student.email}`);
                sentCount++;
            }
        }
        console.log(`[Cron] Attendance Reminder finished. Sent: ${sentCount}`);
    } catch (error) {
        console.error('[Cron] Error in Attendance Reminder job:', error);
    }
};

// ==========================================
// 2. Absentee Check Logic
// ==========================================
const runAbsenteeCheck = async () => {
    console.log('[Cron] Running Absentee Check...');
    try {
        const students = await User.find({ role: 'student', status: { $in: ['active', 'approved'] } });

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        let markedCount = 0;

        for (const student of students) {
            const attendance = await Attendance.findOne({
                student: student._id,
                date: { $gte: startOfDay, $lte: endOfDay }
            });

            if (!attendance) {
                await Attendance.create({
                    student: student._id,
                    status: 'absent',
                    date: new Date(),
                    remarks: 'System marked as absent (Curfew passed)'
                });

                await emailService.sendAbsentNotification(student);
                console.log(`[Cron] Marked ${student.email} as absent`);
                markedCount++;
            }
        }
        console.log(`[Cron] Absentee Check finished. Marked: ${markedCount}`);
    } catch (error) {
        console.error('[Cron] Error in Absentee Check job:', error);
    }
};

// ==========================================
// 3. Payment Reminder Logic
// ==========================================
const runPaymentReminder = async () => {
    console.log('[Cron] Running Payment Reminder...');
    try {
        // Due dates are entered in PH time (UTC+8) but stored in MongoDB as UTC.
        // e.g., a due date of "May 2" (PH) is stored as "May 1 16:00 UTC".
        // We must shift our query window by +8 hours to match correctly.
        const PH_OFFSET_MS = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

        const nowUTC = new Date();

        // "Tomorrow" start in PH time = midnight PH tomorrow = UTC tomorrow 00:00 - 8h = UTC today 16:00
        const tomorrowStartPH = new Date(nowUTC);
        tomorrowStartPH.setUTCDate(tomorrowStartPH.getUTCDate() + 1);
        tomorrowStartPH.setUTCHours(0, 0, 0, 0);
        const tomorrowStartUTC = new Date(tomorrowStartPH.getTime() - PH_OFFSET_MS);

        // "Tomorrow" end in PH time = 23:59:59 PH tomorrow = UTC tomorrow 23:59:59 - 8h = UTC tomorrow 15:59:59
        const tomorrowEndPH = new Date(tomorrowStartPH);
        tomorrowEndPH.setUTCHours(23, 59, 59, 999);
        const tomorrowEndUTC = new Date(tomorrowEndPH.getTime() - PH_OFFSET_MS);

        console.log(`[Cron] Payment Reminder: searching for due dates between ${tomorrowStartUTC.toISOString()} and ${tomorrowEndUTC.toISOString()}`);

        // Find pending or rejected payments due tomorrow (in PH time)
        const payments = await Payment.find({
            status: { $in: ['pending', 'rejected'] },
            dueDate: { $gte: tomorrowStartUTC, $lte: tomorrowEndUTC }
        }).populate('student');

        let sentCount = 0;

        for (const payment of payments) {
            if (payment.student) {
                await emailService.sendPaymentReminder(payment.student, payment);
                await createNotification(
                    payment.student._id,
                    `Friendly reminder: Your payment for ${payment.type} is due tomorrow.`,
                    'info',
                    payment._id,
                    'Payment'
                );
                console.log(`[Cron] Sent payment reminder to ${payment.student.email}`);
                sentCount++;
            }
        }
        console.log(`[Cron] Payment Reminder finished. Sent: ${sentCount}`);
    } catch (error) {
        console.error('[Cron] Error in Payment Reminder job:', error);
    }
};

// ==========================================
// 4. Overdue Payment Check Logic
// ==========================================
const runOverduePaymentCheck = async () => {
    console.log('[Cron] Running Overdue Payment Check...');
    try {
        await updateOverdueStatus();
        console.log('[Cron] Overdue Payment Check finished.');
    } catch (error) {
        console.error('[Cron] Error in Overdue Payment Check job:', error);
    }
};

const scheduleJobs = () => {
    console.log('[Cron] Initializing scheduled jobs...');

    cron.schedule('0 8 * * *', runAttendanceReminder);
    cron.schedule('0 21 * * *', runAbsenteeCheck);
    cron.schedule('0 9 * * *', runPaymentReminder);
    cron.schedule('0 0 * * *', runOverduePaymentCheck); // Every midnight
};

module.exports = {
    scheduleJobs,
    runAttendanceReminder,
    runAbsenteeCheck,
    runPaymentReminder
};
