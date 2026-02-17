const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendEmail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: `"DormSync" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        };
        await transporter.sendMail(mailOptions);
        console.log(`[Email] Sent to ${to}: ${subject}`);
    } catch (error) {
        console.error('[Email] Error sending email:', error);
        throw error; // Rethrow to see if this causes the 500
    }
};

const sendOTPEmail = async (email, otp) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #001F3F; text-align: center;">Verify Your Account</h2>
            <p style="color: #555; font-size: 16px;">Hello,</p>
            <p style="color: #555; font-size: 16px;">Use the following OTP to verify your DormSync account. This code is valid for 10 minutes.</p>
            <div style="text-align: center; margin: 30px 0;">
                <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #001F3F; background-color: #f4f4f4; padding: 10px 20px; border-radius: 5px;">${otp}</span>
            </div>
            <p style="color: #555; font-size: 14px; text-align: center;">If you didn't request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">&copy; ${new Date().getFullYear()} DormSync. All rights reserved.</p>
        </div>
    `;
    await sendEmail(email, 'DormSync Verification OTP', html);
};

const sendAttendanceReminder = async (student) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #001F3F; text-align: center;">Attendance Reminder</h2>
            <p>Hello ${student.firstName || student.name || 'Student'},</p>
            <p>This is a reminder to mark your attendance for today. Please log in to DormSync and submit your status.</p>
        </div>
    `;
    await sendEmail(student.email, 'Reminder: Mark Your Attendance', html);
};

const sendAbsentNotification = async (student) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; border-left: 5px solid #FF4136;">
            <h2 style="color: #FF4136; text-align: center;">Marked as Absent</h2>
            <p>Hello ${student.firstName || student.name || 'Student'},</p>
            <p>You have been marked as <strong>Absent</strong> for today because you did not log your attendance before the 9:00 PM cutoff.</p>
            <p>If this is a mistake, please contact the administration immediately.</p>
        </div>
    `;
    await sendEmail(student.email, 'Absent Notification', html);
};

const sendPaymentReminder = async (student, payment) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #001F3F; text-align: center;">Payment Reminder</h2>
            <p>Hello ${student.firstName || student.name || 'Student'},</p>
            <p>This is a reminder that you have a payment due tomorrow.</p>
            <ul>
                <li><strong>Type:</strong> ${payment.type}</li>
                <li><strong>Amount:</strong> ₱${payment.amount}</li>
                <li><strong>Due Date:</strong> ${new Date(payment.dueDate).toLocaleDateString()}</li>
            </ul>
            <p>Please log in to settle your payment.</p>
        </div>
    `;
    await sendEmail(student.email, 'Payment Reminder: Due Tomorrow', html);
};

const sendPaymentReceipt = async (student, payment) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #001F3F; text-align: center;">Payment Receipt</h2>
            <p>Hello ${student.firstName || student.name || 'Student'},</p>
            <p>Thank you for your payment. Details are below:</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${payment._id}</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p style="margin: 5px 0;"><strong>Amount Paid:</strong> ₱${payment.amount}</p>
                <p style="margin: 5px 0;"><strong>Type:</strong> ${payment.type}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> Paid</p>
            </div>
            <p>This email serves as your official receipt.</p>
        </div>
    `;
    await sendEmail(student.email, 'Payment Confirmation & Receipt', html);
};

const sendApprovalEmail = async (user) => {
    const subject = 'Your DormSync Account has been Approved!';
    const loginLink = process.env.CLIENT_URL ? `${process.env.CLIENT_URL}/login` : 'http://localhost:5173/login';
    const html = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h1 style="color: #001F3F;">Welcome to DormSync!</h1>
            <p>Hi ${user.name},</p>
            <p>Your account registration has been <strong>APPROVED</strong> by the administrator.</p>
            <p>You can now log in to the portal using your credentials.</p>
            <br>
            <a href="${loginLink}" style="background-color: #001F3F; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to DormSync</a>
            <br><br>
            <p>Regards,<br>DormSync Team</p>
        </div>
    `;
    return sendEmail(user.email, subject, html);
};

const sendRejectionEmail = async (user, reason = 'No reason provided') => {
    const subject = 'Update on your DormSync Account Request';
    const html = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h1 style="color: #d9534f;">Account Request Update</h1>
            <p>Hi ${user.name},</p>
            <p>We regret to inform you that your registration request for DormSync has been <strong>declined</strong>.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <br>
            <p>If you believe this is an error, please contact the dormitory administration.</p>
            <br>
            <p>Regards,<br>DormSync Team</p>
        </div>
    `;
    return sendEmail(user.email, subject, html);
};

module.exports = {
    sendEmail,
    sendOTPEmail,
    sendAttendanceReminder,
    sendAbsentNotification,
    sendPaymentReminder,
    sendPaymentReceipt,
    sendApprovalEmail,
    sendRejectionEmail
};
