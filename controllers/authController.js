const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { logAction } = require('../utils/logger');

const nodemailer = require('nodemailer');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Email Transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendOTPEmail = async (email, otp) => {
    const mailOptions = {
        from: `"DormSync" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'DormSync Verification OTP',
        html: `
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
        `
    };

    await transporter.sendMail(mailOptions);
};

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user (Step 1: Create Account & Send OTP)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, role, studentProfile, studentId } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            // If user exists but is unverified, resend OTP
            if (userExists.status === 'unverified') {
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                userExists.otp = otp;
                userExists.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

                // Update details if changed (optional, but good for retries)
                userExists.name = name;
                userExists.password = await bcrypt.hash(password, await bcrypt.genSalt(10));

                await userExists.save();
                await sendOTPEmail(email, otp);

                return res.status(200).json({
                    message: 'Account exists but unverified. New OTP sent.',
                    email: userExists.email
                });
            }
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Create user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
            studentId: role === 'student' ? studentId : undefined,
            studentProfile: role === 'student' ? studentProfile : undefined,
            status: role === 'admin' ? 'approved' : 'unverified', // Students need OTP
            otp: role === 'admin' ? undefined : otp,
            otpExpires: role === 'admin' ? undefined : otpExpires
        });

        if (user) {
            if (role === 'student') {
                await sendOTPEmail(email, otp);
                res.status(201).json({
                    message: 'Registration successful. OTP sent to email.',
                    email: user.email,
                    status: 'unverified'
                });
            } else {
                res.status(201).json({
                    _id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    message: 'Admin registered successfully.'
                });
            }

            await logAction(user.id, 'REGISTER', 'User registered (Unverified)', req);

        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({
            email,
            otp,
            otpExpires: { $gt: Date.now() }
        }).select('+otp +otpExpires'); // Explicitly select these fields

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.status = 'active'; // No more 'approved' needed, direct to active
        user.otp = undefined;
        user.otpExpires = undefined;

        // Ensure student profile is active
        if (user.studentProfile) {
            user.studentProfile.status = 'active';
        }

        await user.save();

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id),
            studentProfile: user.studentProfile,
            message: 'Email verified successfully'
        });

        await logAction(user.id, 'VERIFY_OTP', 'User verified email via OTP', req);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {

            if (user.role !== 'admin' && user.status === 'pending') {
                return res.status(403).json({ message: 'Account is pending approval. Please wait for admin confirmation.' });
            }

            if (user.role !== 'admin' && user.status === 'rejected') {
                return res.status(403).json({ message: 'Account has been rejected. Contact admin.' });
            }

            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id),
                studentProfile: user.studentProfile
            });

            await logAction(user.id, 'LOGIN', 'User logged in', req);
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    const { _id, name, email, role, studentProfile, status } = await User.findById(req.user.id);

    res.status(200).json({
        id: _id,
        name,
        email,
        role,
        studentProfile,
        status
    });
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;

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

        res.json({
            _id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            token: generateToken(updatedUser.id), // Re-issue token if needed (optional)
            studentProfile: updatedUser.studentProfile
        });

        await logAction(updatedUser.id, 'UPDATE_PROFILE', 'User updated profile', req);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Google Login
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const { name, email, picture } = ticket.getPayload();

        let user = await User.findOne({ email });

        if (!user) {
            // Create a new user if one doesn't exist
            // Generate a random password since they login via Google
            const password = Math.random().toString(36).slice(-8);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            user = await User.create({
                name,
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
                message: 'Registration successful. Please wait for admin approval.',
                status: 'pending'
            });
        }

        // Allow Admins to bypass pending/rejected checks
        if (user.role !== 'admin') {
            if (user.status === 'pending') {
                return res.status(403).json({
                    message: 'Account is pending approval. Please wait for admin confirmation.',
                    code: 'PENDING_APPROVAL'
                });
            }

            if (user.status === 'rejected') {
                return res.status(403).json({ message: 'Account has been rejected. Contact admin.' });
            }
        }

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id),
            studentProfile: user.studentProfile
        });

        // Log Google login
        await logAction(user.id, 'LOGIN_GOOGLE', 'User logged in via Google', req);
    } catch (error) {
        res.status(400).json({ message: 'Google login failed', error: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    googleLogin,
    getMe,
    updateProfile,
    verifyOTP
};
