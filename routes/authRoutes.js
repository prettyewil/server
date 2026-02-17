const express = require('express');
const router = express.Router();
const { registerUser, loginUser, googleLogin, getMe, updateProfile, verifyOTP, forgotPassword, resetPassword, verifyResetOTP } = require('../controllers/authController');
const { protect, protectOnboarding } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/verify-otp', verifyOTP);
router.post('/login', loginUser);
router.post('/google', googleLogin);
router.get('/me', protectOnboarding, getMe);
router.put('/profile', protectOnboarding, updateProfile);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);

module.exports = router;
