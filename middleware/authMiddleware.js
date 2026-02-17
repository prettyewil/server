const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Decoded Token ID:', decoded.id);

            // Get user from the token
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                console.log('User not found for ID:', decoded.id);
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            // Check if user is active/approved
            if (req.user.status !== 'active' && req.user.status !== 'approved') {
                console.log('User status not active/approved:', req.user.status);
                return res.status(403).json({ message: 'Access denied. Account not verified.', status: req.user.status });
            }

            next();
        } catch (error) {
            console.error('Auth Middleware Error:', error.message);
            console.log('Received Token:', token);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};
const protectOnboarding = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            // ALLOW 'pending' status for onboarding
            if (req.user.status === 'rejected' || (req.user.status !== 'active' && req.user.status !== 'approved' && req.user.status !== 'pending')) {
                // Still block rejected or unknown states, but allow pending
                // Actually, original code blocked anything not active/approved.
                // We want to allow pending.
                if (req.user.status !== 'pending' && req.user.status !== 'active' && req.user.status !== 'approved') {
                    return res.status(403).json({ message: 'Access denied. Account not verified.', status: req.user.status });
                }
            }

            next();
        } catch (error) {
            console.error('Auth Middleware Error:', error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect, protectOnboarding };
