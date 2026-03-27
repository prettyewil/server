const { Vonage } = require('@vonage/server-sdk');

const vonage = new Vonage({
  apiKey: process.env.VONAGE_API_KEY || "aefc593c",
  apiSecret: process.env.VONAGE_API_SECRET || "FC1trA8aGY1BIAee"
});

const sendVerificationSMS = async (phoneNumber) => {
    try {
        // Vonage prefers phone numbers without '+'
        const formattedNumber = phoneNumber.replace('+', '');
        const resp = await vonage.verify.start({
            number: formattedNumber,
            brand: "DormSync"
        });
        console.log(`[Vonage] Verification sent to ${phoneNumber}. Request ID: ${resp.request_id}`);
        return resp.request_id;
    } catch (error) {
        console.error('[Vonage] Error sending verification SMS:', error);
        throw error;
    }
};

const checkVerificationSMS = async (requestId, code) => {
    try {
        const resp = await vonage.verify.check(requestId, code);
        // Vonage returns status '0' for success
        if (resp.status === '0') {
            console.log(`[Vonage] Verification check for request ${requestId} approved.`);
            return 'approved';
        } else {
            console.warn(`[Vonage] Verification check failed. Status: ${resp.status}, Error text: ${resp.error_text}`);
            return 'pending';
        }
    } catch (error) {
        console.error('[Vonage] Error checking verification SMS:', error);
        throw error;
    }
};

module.exports = {
    sendVerificationSMS,
    checkVerificationSMS
};
