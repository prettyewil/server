const cron = require('node-cron');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const emailService = require('./emailService');
const { logAction } = require('../utils/logger');
const { updateOverdueStatus } = require('../controllers/paymentController');

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
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const tomorrowEnd = new Date(tomorrow);
        tomorrowEnd.setHours(23, 59, 59, 999);

        // Find pending payments due tomorrow
        const payments = await Payment.find({
            status: 'pending',
            dueDate: { $gte: tomorrow, $lte: tomorrowEnd }
        }).populate('student');

        let sentCount = 0;

        for (const payment of payments) {
            if (payment.student) {
                await emailService.sendPaymentReminder(payment.student, payment);
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
