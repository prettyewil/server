const express = require('express');
const router = express.Router();
const { 
    registerUser, 
    loginUser, 
    loginOtpRequest,
    loginOtpVerify,
    googleLogin, 
    getMe, 
    updateProfile, 
    verifyOTP, 
    forgotPassword, 
    resetPassword, 
    verifyResetOTP,
    verify2FA 
} = require('../controllers/authController');
const { protect, protectOnboarding } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/verify-otp', verifyOTP);
router.post('/verify-2fa', verify2FA);
router.post('/login', loginUser);
router.post('/login-otp-request', loginOtpRequest);
router.post('/login-otp-verify', loginOtpVerify);
router.post('/google', googleLogin);
router.get('/me', protectOnboarding, getMe);
router.put('/profile', protectOnboarding, updateProfile);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);

module.exports = router;
