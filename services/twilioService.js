const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

let client;
if (accountSid && authToken && accountSid !== 'your_account_sid_here') {
    client = twilio(accountSid, authToken);
}

const sendVerificationSMS = async (phoneNumber) => {
    if (!client || !verifyServiceSid) {
        console.warn('Twilio is not configured. Skipping SMS OTP.');
        return null;
    }
    try {
        const verification = await client.verify.v2.services(verifyServiceSid)
            .verifications
            .create({ to: phoneNumber, channel: 'sms' });
        console.log(`[Twilio] Verification sent to ${phoneNumber}. Status: ${verification.status}`);
        return verification.status;
    } catch (error) {
        console.error('[Twilio] Error sending verification SMS:', error);
        throw error;
    }
};

const checkVerificationSMS = async (phoneNumber, code) => {
    if (!client || !verifyServiceSid) {
        console.warn('Twilio is not configured. Skipping SMS OTP check.');
        // If Twilio is not enabled, we throw an error as this path shouldn't be reached
        // but for safety, we return 'pending' to fail verification.
        return 'pending';
    }
    try {
        const verificationCheck = await client.verify.v2.services(verifyServiceSid)
            .verificationChecks
            .create({ to: phoneNumber, code: code });
        console.log(`[Twilio] Verification check for ${phoneNumber}. Status: ${verificationCheck.status}`);
        return verificationCheck.status; // 'approved' or 'pending'
    } catch (error) {
        console.error('[Twilio] Error checking verification SMS:', error);
        throw error;
    }
};

const sendCustomSMS = async (phoneNumber, otp) => {
    if (!client || !process.env.TWILIO_PHONE_NUMBER) {
        console.warn('Twilio complete configuration (including TWILIO_PHONE_NUMBER) is missing. Logging SMS instead: ', otp);
        return null;
    }
    try {
        const message = await client.messages.create({
            body: `Your DormSync verification code is: ${otp}. It will expire in 10 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
        });
        console.log(`[Twilio] Custom SMS sent to ${phoneNumber}. SID: ${message.sid}`);
        return message.sid;
    } catch (error) {
        console.error('[Twilio] Error sending custom SMS:', error);
        throw error;
    }
};

module.exports = {
    sendVerificationSMS,
    checkVerificationSMS,
    sendCustomSMS
};
