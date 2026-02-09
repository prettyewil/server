const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendEmail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"DormSync Admin" <${process.env.SMTP_USER}>`, // sender address
            to,
            subject,
            html,
        });

        console.log("Message sent: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error; // Let the caller handle the error or just log it
    }
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
    sendApprovalEmail,
    sendRejectionEmail
};
