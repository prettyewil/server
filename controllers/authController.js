const asyncHandler = require('express-async-handler');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { logAction } = require('../utils/logger');

const nodemailer = require('nodemailer');
const emailService = require('../services/emailService');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Email logic moved to services/emailService.js

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user (Step 1: Create Account & Send OTP)
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    // name is now optional/virtual, we expect parts
    const { firstName, lastName, middleInitial, name, email, password, role, studentProfile, studentId } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        // If user exists but is unverified, resend OTP
        if (userExists.status === 'unverified') {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
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

            userExists.password = await bcrypt.hash(password, await bcrypt.genSalt(10));

            await userExists.save();
            await emailService.sendOTPEmail(email, otp);

            return res.status(200).json({
                message: 'Account exists but unverified. New OTP sent.',
                email: userExists.email
            });
        }
        res.status(400);
        throw new Error('User already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
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
        studentProfile: role === 'student' ? studentProfile : undefined,
        status: 'unverified', // All new registrations (except explicit admin creates) need OTP
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
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();
    await emailService.sendOTPEmail(email, otp);

    res.json({ message: 'OTP sent to your email.' });
    await logAction(user.id, 'FORGOT_PASSWORD', 'Requested password reset OTP', req);
});

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
        email,
        otp,
        otpExpires: { $gt: Date.now() }
    }).select('+otp +otpExpires');

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired OTP');
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save();

    res.json({ message: 'Password reset successful. Please login.' });
    await logAction(user.id, 'RESET_PASSWORD', 'Password reset successfully', req);
});

// @desc    Verify Reset OTP (Check only)
// @route   POST /api/auth/verify-reset-otp
// @access  Public
const verifyResetOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const user = await User.findOne({
        email,
        otp,
        otpExpires: { $gt: Date.now() }
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired OTP');
    }

    res.json({ message: 'OTP verified' });
});

// @desc    Verify OTP (Registration)
// @access  Public
const verifyOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const user = await User.findOne({
        email,
        otp,
        otpExpires: { $gt: Date.now() }
    }).select('+otp +otpExpires'); // Explicitly select these fields

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired OTP');
    }

    // Set status based on role
    if (user.role === 'staff') {
        user.status = 'pending'; // Staff needs admin approval
    } else {
        user.status = 'active'; // Students auto-activate (or 'pending' if you want admin approval for students too)
    }

    user.otp = undefined;
    user.otpExpires = undefined;

    // Ensure student profile is active
    if (user.studentProfile) {
        user.studentProfile.status = 'active';
    }

    await user.save();

    const response = {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        role: user.role,
        studentProfile: user.studentProfile,
        studentId: user.studentId,
        message: 'Email verified successfully'
    };

    if (user.status === 'active') {
        response.token = generateToken(user.id);
    }

    res.json(response);

    await logAction(user.id, 'VERIFY_OTP', 'User verified email via OTP', req);
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // user could adhere to either email address or student ID
    // The frontend sends 'email' field but it could be student ID
    const identifier = email;

    const user = await User.findOne({
        $or: [
            { email: identifier.toLowerCase() },
            { studentId: identifier }
        ]
    });

    if (user && (await bcrypt.compare(password, user.password))) {

        const allowedRoles = ['admin', 'manager', 'super_admin'];

        if (!allowedRoles.includes(user.role) && user.status === 'pending') {
            res.status(403);
            throw new Error('Account is pending approval. Please wait for admin confirmation.');
        }

        if (!allowedRoles.includes(user.role) && user.status === 'rejected') {
            res.status(403);
            throw new Error('Account has been rejected. Contact admin.');
        }

        res.json({
            _id: user.id,
            name: user.name,
            firstName: user.firstName,
            lastName: user.lastName,
            middleInitial: user.middleInitial,
            email: user.email,
            role: user.role,
            token: generateToken(user.id),
            studentProfile: user.studentProfile,
            studentId: user.studentId
        });

        await logAction(user.id, 'LOGIN', 'User logged in', req);
    } else {
        res.status(401);
        throw new Error('Invalid email/student ID or password');
    }
});

// @desc    Get current user data
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    // 2024-02-07: Modified to include studentId and name parts
    const { _id, name, firstName, lastName, middleInitial, email, role, studentProfile, status, studentId } = await User.findById(req.user.id);

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
        studentId
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
        studentId: updatedUser.studentId
    });

    await logAction(updatedUser.id, 'UPDATE_PROFILE', 'User updated profile', req);
});

// @desc    Google Login
// @route   POST /api/auth/google
// @access  Public
const googleLogin = asyncHandler(async (req, res) => {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { name, email, picture, given_name, family_name } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
        // Create a new user if one doesn't exist
        // Generate a random password since they login via Google
        const password = Math.random().toString(36).slice(-8);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = await User.create({
            firstName: given_name || name.split(' ')[0],
            lastName: family_name || name.split(' ').slice(1).join(' ') || '.',
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

        return res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id),
            status: 'pending',
            studentProfile: user.studentProfile,
            studentId: user.studentId,
            message: 'Registration successful. Complete your profile.'
        });
    }

    // Allow Admins, Managers, Super Admins to bypass pending/rejected checks
    const allowedRoles = ['admin', 'manager', 'super_admin'];
    if (!allowedRoles.includes(user.role)) {
        // Check if rejected
        if (user.status === 'rejected') {
            res.status(403);
            throw new Error('Account has been rejected. Contact admin.');
        }
        // Pending users are allowed to proceed to get a token
    }

    res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id),
        studentProfile: user.studentProfile,
        studentId: user.studentId
    });

    // Log Google login
    await logAction(user.id, 'LOGIN_GOOGLE', 'User logged in via Google', req);
});

module.exports = {
    registerUser,
    loginUser,
    googleLogin,
    getMe,
    updateProfile,
    verifyOTP,
    forgotPassword,
    resetPassword,
    verifyResetOTP
};
