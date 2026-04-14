const asyncHandler = require('express-async-handler');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { logAction } = require('../utils/logger');
const SystemSettings = require('../models/SystemSettings');

const nodemailer = require('nodemailer');
const emailService = require('../services/emailService');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const { validatePassword } = require('../utils/passwordValidator');

// Generate JWT Token
const generateToken = async (id) => {
    let settings = await SystemSettings.findOne();
    const expiresIn = settings ? `${settings.sessionTimeout}m` : '15m';
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn,
    });
};

// @desc    Register a new user (Step 1: Create Account & Send OTP)
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    // name is now optional/virtual, we expect parts
    const { firstName, lastName, middleInitial, name, email, password, role, studentProfile, studentId, otpMethod } = req.body;

    const passwordError = await validatePassword(password);
    if (passwordError) {
        await logAction(null, 'REGISTER_FAILED', `Registration failed for ${email}. Reason: password policy (${passwordError})`, req);
        res.status(400);
        throw new Error(passwordError);
    }
    
    if (!email.toLowerCase().endsWith('@buksu.edu.ph') && !email.toLowerCase().endsWith('@student.buksu.edu.ph')) {
        await logAction(null, 'REGISTER_FAILED', `Registration failed for ${email}. Reason: invalid email domain.`, req);
        res.status(400);
        throw new Error('Please use your @student.buksu.edu.ph or @buksu.edu.ph email.');
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
        // If user exists but is unverified, resend OTP
        if (userExists.status === 'unverified') {
            const otp = generateOTP();
            userExists.otp = otp;
            userExists.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

            // Update details if changed (optional, but good for retries)
            if (firstName) userExists.firstName = firstName;
            if (lastName) userExists.lastName = lastName;
            if (middleInitial) userExists.middleInitial = middleInitial;
            // Fallback if old 'name' passed
            if (!firstName && name) {
                const parts = name.split(' ');
                userExists.firstName = parts[0];
                userExists.lastName = parts.slice(1).join(' ');
            }

            if (studentProfile) {
                userExists.studentProfile = userExists.studentProfile || {};
                if (studentProfile.phoneNumber) userExists.studentProfile.phoneNumber = studentProfile.phoneNumber;
            }

            userExists.password = await bcrypt.hash(password, await bcrypt.genSalt(10));

            await userExists.save();

            await emailService.sendOTPEmail(email, otp);

            return res.status(200).json({
                message: 'Account exists but unverified. New OTP sent to email.',
                email: userExists.email
            });
        }
        await logAction(userExists._id, 'REGISTER_FAILED', `Registration failed for ${email}. Reason: User already exists.`, req);
        res.status(400);
        throw new Error('User already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Handle name splitting if only old 'name' is provided
    let fName = firstName;
    let lName = lastName;

    if (!fName && name) {
        const parts = name.split(' ');
        fName = parts[0];
        lName = parts.slice(1).join(' ') || '.'; // Fallback dot if no last name
    }

    // Create user
    const user = await User.create({
        firstName: fName,
        lastName: lName,
        middleInitial,
        email,
        password: hashedPassword,
        role,
        studentId: role === 'student' ? studentId : undefined,
        studentProfile: (role === 'student' || otpMethod === 'sms') ? studentProfile : undefined,
        status: 'pending', // Default to pending so they appear in Admin dashboard immediately
        otp,
        otpExpires
    });

    if (user) {
        await emailService.sendOTPEmail(email, otp);
        res.status(201).json({
            message: 'Registration successful. OTP sent to email.',
            email: user.email,
            status: 'unverified'
        });

        await logAction(user.id, 'REGISTER', `User registered as ${role} (Unverified)`, req);
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Forgot Password - Send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
    const { email, otpMethod } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    const otp = generateOTP();
    await User.updateOne(
        { _id: user._id }, 
        { $set: { otp: otp, otpExpires: Date.now() + 10 * 60 * 1000 } }
    );

    await emailService.sendOTPEmail(email, otp);

    res.json({ message: 'OTP sent to your email.' });
    await logAction(user.id, 'FORGOT_PASSWORD', 'Requested password reset OTP', req);
});

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;

    const passwordError = await validatePassword(newPassword);
    if (passwordError) {
        res.status(400);
        throw new Error(passwordError);
    }

    const user = await User.findOne({ email }).select('+otp +otpExpires');

    if (!user) {
        res.status(400);
        throw new Error('User not found');
    }

    const isValid = user.otp === otp && user.otpExpires > Date.now();

    if (!isValid) {
        res.status(400);
        throw new Error('Invalid or expired OTP');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);
    
    await User.updateOne(
        { _id: user._id }, 
        { 
            $set: { password: hashedNewPassword },
            $unset: { otp: 1, otpExpires: 1 }
        }
    );

    res.json({ message: 'Password reset successful. Please login.' });
    await logAction(user.id, 'RESET_PASSWORD', 'Password reset successfully', req);
});

// @desc    Verify Reset OTP (Check only)
// @route   POST /api/auth/verify-reset-otp
// @access  Public
const verifyResetOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select('+otp +otpExpires');

    if (!user) {
        res.status(400);
        throw new Error('User not found');
    }

    const isValid = user.otp === otp && user.otpExpires > Date.now();

    if (!isValid) {
        res.status(400);
        throw new Error('Invalid or expired OTP');
    }

    res.json({ message: 'OTP verified' });
});

// @desc    Verify OTP (Registration)
// @access  Public
const verifyOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select('+otp +otpExpires');

    if (!user) {
        res.status(400);
        throw new Error('User not found');
    }

    const isValid = user.otp === otp && user.otpExpires > Date.now();

    if (!isValid) {
        res.status(400);
        throw new Error('Invalid or expired OTP');
    }

    // Set status based on role
    // Both staff and students need admin approval now
    user.status = 'pending';

    // Ensure student profile is active
    if (user.studentProfile) {
        user.studentProfile.status = 'active';
    }

    await User.updateOne(
        { _id: user._id },
        { 
            $set: { status: 'pending', studentProfile: user.studentProfile },
            $unset: { otp: 1, otpExpires: 1 }
        }
    );

    const response = {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentProfile: user.studentProfile,
        studentId: user.studentId,
        status: user.status,
        message: 'Email verified successfully'
    };

    console.log('Verifying OTP. User Status:', user.status);
    if (['active', 'pending', 'unverified'].includes(user.status)) {
        response.token = await generateToken(user.id);
        console.log('Token generated for user:', user.email);
    } else {
        console.log('No token generated. Status not allowed:', user.status);
    }

    res.json(response);

    await logAction(user.id, 'VERIFY_OTP', 'User verified email via OTP', req);
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const rawEmail = req.body.email;
    const { password } = req.body;

    // user could adhere to either email address or student ID
    // The frontend sends 'email' field but it could be student ID
    const identifier = typeof rawEmail === 'string' ? rawEmail.trim() : '';

    if (!identifier) {
        res.status(400);
        throw new Error('Email or student ID is required');
    }

    const user = await User.findOne({
        $or: [
            { email: identifier.toLowerCase() },
            { studentId: identifier }
        ]
    });

    if (!user) {
        await logAction(null, 'LOGIN_FAILED', `Failed login attempt. email: ${identifier}`, req);
        res.status(404);
        throw new Error('Account not found');
    }

    // Check for lockout
    if (user.lockUntil && user.lockUntil > Date.now()) {
        const lockDuration = Math.ceil((user.lockUntil - Date.now()) / 60000);
        await logAction(user.id, 'LOGIN_FAILED', `Failed login attempt. Reason: Account locked for ${lockDuration} minutes.`, req);
        res.status(403);
        throw new Error(`Account locked. Try again in ${lockDuration} minutes.`);
    }

    if (!password) {
        await logAction(user._id || null, 'LOGIN_FAILED', 'Failed login attempt. reason: Missing password', req);
        res.status(401);
        throw new Error('invalid email or password');
    }

    if (await bcrypt.compare(password, user.password)) {

        // Reset login attempts on successful match
        if (user.loginAttempts > 0) {
            user.loginAttempts = 0;
            user.lockUntil = undefined;
            await user.save();
        }

        const allowedRoles = ['admin', 'manager', 'super_admin'];

        // Removed check for 'pending' status to allow them to login and see the PendingValidation screen
        // if (!allowedRoles.includes(user.role) && user.status === 'pending') {
        //     res.status(403);
        //     throw new Error('Account is pending approval. Please wait for admin confirmation.');
        // }

        if (!allowedRoles.includes(user.role) && user.status === 'rejected') {
            await logAction(user.id, 'LOGIN_FAILED', 'Failed login attempt. Reason: Account has been rejected.', req);
            res.status(403);
            throw new Error('Account has been rejected. Contact admin.');
        }

        // Email OTP (2FA) for every account after password check
        const otp = generateOTP();
        await User.updateOne(
            { _id: user._id }, 
            { $set: { otp: otp, otpExpires: Date.now() + 10 * 60 * 1000 } }
        );
        
        await emailService.sendOTPEmail(user.email, otp);

        res.json({
            requires2FA: true,
            email: user.email,
            message: 'OTP sent to your email for Two-Factor Authentication.'
        });

        await logAction(user.id, 'LOGIN', 'User logged in', req);
    } else {
        user.loginAttempts += 1;
        if (user.loginAttempts >= 5) {
            user.lockUntil = Date.now() + 15 * 60 * 1000; // 15 mins
            await logAction(user.id, 'ACCOUNT_LOCKED', 'Account temporarily locked due to 5 failed attempts', req);
        } else {
            await logAction(user.id, 'LOGIN_FAILED', 'Failed login attempt. reason: Invalid password', req);
        }
        await user.save();

        res.status(401);
        throw new Error(user.lockUntil && user.lockUntil > Date.now() ? 'Account locked due to too many failed attempts' : 'invalid email or password');
    }
});

// @desc    Get current user data
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    // 2024-02-07: Modified to include studentId and name parts
    const { _id, name, firstName, lastName, middleInitial, email, role, studentProfile, status, studentId, skipEmailOtp } = await User.findById(req.user.id);

    res.status(200).json({
        id: _id,
        name,
        firstName,
        lastName,
        middleInitial,
        email,
        role,
        studentProfile,
        status,
        studentId,
        skipEmailOtp: !!skipEmailOtp,
    });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    if (req.body.firstName) user.firstName = req.body.firstName;
    if (req.body.lastName) user.lastName = req.body.lastName;
    if (req.body.middleInitial) user.middleInitial = req.body.middleInitial;

    // Handle full name update from frontend
    if (req.body.name) {
        const parts = req.body.name.split(' ');
        if (parts.length > 0) {
            user.firstName = parts[0];
            if (parts.length > 1) {
                user.lastName = parts.slice(1).join(' ');
            }
        }
    }

    user.email = req.body.email || user.email;

    // Update Student ID if provided
    if (req.body.studentId) {
        user.studentId = req.body.studentId;
    }

    // If password is being updated
    if (req.body.password) {
        const passwordError = await validatePassword(req.body.password);
        if (passwordError) {
            res.status(400);
            throw new Error(passwordError);
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
    }

    // Allow updating specific student profile fields if they exist
    if (req.body.studentProfile && user.studentProfile) {
        user.studentProfile.phoneNumber = req.body.studentProfile.phoneNumber || user.studentProfile.phoneNumber;
        user.studentProfile.emergencyContactName = req.body.studentProfile.emergencyContactName || user.studentProfile.emergencyContactName;
        user.studentProfile.emergencyContactPhone = req.body.studentProfile.emergencyContactPhone || user.studentProfile.emergencyContactPhone;
    }

    const updatedUser = await user.save();

    console.log('Updated User:', {
        id: updatedUser.id,
        studentId: updatedUser.studentId,
        studentProfile: updatedUser.studentProfile
    });

    res.json({
        _id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        // token: generateToken(updatedUser.id), // Do not re-issue token to avoid sync issues
        status: updatedUser.status,
        studentProfile: updatedUser.studentProfile,
        studentId: updatedUser.studentId,
        skipEmailOtp: !!updatedUser.skipEmailOtp,
    });

    await logAction(updatedUser.id, 'UPDATE_PROFILE', 'User updated profile', req);
});

// @desc    Google Login
// @route   POST /api/auth/google
// @access  Public
const googleLogin = asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!process.env.GOOGLE_CLIENT_ID) {
        res.status(503);
        throw new Error('Google login is not configured on this server.');
    }

    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { name, email, picture, given_name, family_name } = ticket.getPayload();

    if (!email.endsWith('@buksu.edu.ph') && !email.endsWith('@student.buksu.edu.ph')) {
        await logAction(null, 'LOGIN_GOOGLE_FAILED', `Google login failed for ${email}. Reason: invalid email domain.`, req);
        res.status(400);
        throw new Error('Please use your @student.buksu.edu.ph or @buksu.edu.ph email.');
    }

    let user = await User.findOne({ email });

    if (!user) {
        // Create a new user if one doesn't exist
        // Generate a random password since they login via Google
        const password = Math.random().toString(36).slice(-8);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const fName = given_name || (name && name.split(' ')[0]) || 'Student';
        const lName = family_name || (name && name.split(' ').slice(1).join(' ')) || 'User';

        user = await User.create({
            firstName: fName,
            lastName: lName,
            // name: name, // Handled by pre-save
            email,
            password: hashedPassword,
            role: 'student', // Default role for NEW Google users
            status: 'pending',
            studentProfile: {
                status: 'inactive' // Will be effectively inactive if user status is pending, but prepared
            }
        });

        await logAction(user.id, 'REGISTER_GOOGLE', 'User registered via Google (Pending Approval)', req);

        const otp = generateOTP();
        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();
        
        await emailService.sendOTPEmail(user.email, otp);

        res.status(201).json({
            requires2FA: true,
            email: user.email,
            message: 'OTP sent to your email for Two-Factor Authentication.'
        });
        return; // Fixed: Missing return
    }

    // Allow Admins, Managers, Super Admins to bypass pending/rejected checks
    const allowedRoles = ['admin', 'manager', 'super_admin'];
    if (!allowedRoles.includes(user.role)) {
        // Check if rejected
        if (user.status === 'rejected') {
            await logAction(user.id, 'LOGIN_GOOGLE_FAILED', 'Google login failed. Reason: account has been rejected.', req);
            res.status(403);
            throw new Error('Account has been rejected. Contact admin.');
        }
        // Pending users are allowed to proceed to get a token
    }

    // Email OTP (2FA) for every Google login
    const otp = generateOTP();
    await User.updateOne(
        { _id: user._id }, 
        { $set: { otp: otp, otpExpires: Date.now() + 10 * 60 * 1000 } }
    );
    
    await emailService.sendOTPEmail(user.email, otp);

    res.json({
        requires2FA: true,
        email: user.email,
        message: 'OTP sent to your email for Two-Factor Authentication.'
    });

    // Log Google login
    await logAction(user.id, 'LOGIN_GOOGLE', 'User logged in via Google', req);
});

// @desc    Request OTP for Login
// @route   POST /api/auth/login-otp-request
// @access  Public
const loginOtpRequest = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({
        $or: [
            { email: email },
            { studentId: email }
        ]
    });

    if (!user) {
        res.status(404);
        throw new Error('Email not found');
    }

    const otp = generateOTP();
    await User.updateOne(
        { _id: user._id }, 
        { $set: { otp: otp, otpExpires: Date.now() + 10 * 60 * 1000 } }
    );
    
    await emailService.sendOTPEmail(user.email, otp);

    res.json({ message: 'OTP sent to your email.' });
});

// @desc    Verify OTP for Login
// @route   POST /api/auth/login-otp-verify
// @access  Public
const loginOtpVerify = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const user = await User.findOne({
        $or: [
            { email: email },
            { studentId: email }
        ]
    }).select('+otp +otpExpires');

    if (!user) {
        await logAction(null, 'LOGIN_FAILED', `Phone OTP verification failed. Reason: account not found for ${email}`, req);
        res.status(404);
        throw new Error('Email not found');
    }

    const isValid = user.otp === otp && user.otpExpires > Date.now();

    if (!isValid) {
        await logAction(user.id, 'LOGIN_FAILED', `Phone OTP verification failed for ${email}. Reason: invalid or expired OTP.`, req);
        res.status(400);
        throw new Error('Invalid or expired OTP.');
    }

    // Check status
    const allowedRoles = ['admin', 'manager', 'super_admin'];
    if (!allowedRoles.includes(user.role) && user.status === 'rejected') {
        await logAction(user.id, 'LOGIN_FAILED', `Phone OTP verification failed for ${email}. Reason: account rejected.`, req);
        res.status(403);
        throw new Error('Account has been rejected. Contact admin.');
    }

    // Clear OTP
    await User.updateOne(
        { _id: user._id },
        { $unset: { otp: 1, otpExpires: 1 } }
    );

    // Log the action
    await logAction(user.id, 'LOGIN', 'User logged in via Phone OTP', req);

    res.json({
        _id: user.id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        middleInitial: user.middleInitial,
        email: user.email,
        role: user.role,
        token: await generateToken(user.id),
        studentProfile: user.studentProfile,
        studentId: user.studentId,
        status: user.status,
        skipEmailOtp: !!user.skipEmailOtp,
    });
});

// @desc    Verify 2FA OTP for Main Login
// @route   POST /api/auth/verify-2fa
// @access  Public
const verify2FA = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select('+otp +otpExpires');

    if (!user) {
        await logAction(null, 'LOGIN_2FA_FAILED', `2FA verification failed. Reason: account not found for ${email}`, req);
        res.status(404);
        throw new Error('Email not found');
    }

    const isValid = user.otp === otp && user.otpExpires > Date.now();

    if (!isValid) {
        await logAction(user.id, 'LOGIN_2FA_FAILED', `2FA verification failed for ${email}. Reason: invalid or expired OTP.`, req);
        res.status(400);
        throw new Error('Invalid or expired OTP.');
    }

    // Clear OTP
    await User.updateOne(
        { _id: user._id },
        { $unset: { otp: 1, otpExpires: 1 } }
    );

    await logAction(user.id, 'LOGIN_2FA', 'User logged in via 2FA verification', req);

    res.json({
        _id: user.id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        middleInitial: user.middleInitial,
        email: user.email,
        role: user.role,
        token: await generateToken(user.id),
        studentProfile: user.studentProfile,
        studentId: user.studentId,
        status: user.status,
        skipEmailOtp: !!user.skipEmailOtp,
    });
});

module.exports = {
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
};
