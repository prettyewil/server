require('dotenv').config();
const { sendApprovalEmail } = require('./utils/emailService');

const email = process.argv[2];

if (!email) {
    console.error('Please provide an email address as an argument.');
    process.exit(1);
}

const mockUser = {
    name: 'Test User',
    email: email
};

console.log(`Sending test email to ${email}...`);

sendApprovalEmail(mockUser)
    .then(info => {
        console.log('Email sent successfully:', info.messageId);
        process.exit(0);
    })
    .catch(err => {
        console.error('Failed to send email:', err);
        process.exit(1);
    });
