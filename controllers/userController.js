const User = require('../models/User');
const { sendApprovalEmail, sendRejectionEmail } = require('../utils/emailService');
const { logAction } = require('../utils/logger');
const bcrypt = require('bcryptjs');

// @desc    Get all staff
// @route   GET /api/users/staff
// @access  Admin
const getStaff = async (req, res) => {
    try {
        const staff = await User.find({ role: { $in: ['staff', 'admin', 'manager'] } }).select('-password').sort({ lastName: 1, firstName: 1 });
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new staff member
// @route   POST /api/users/staff
// @access  Admin
const createStaff = async (req, res) => {
    // Expect split fields
    const { firstName, lastName, middleInitial, name, email, password } = req.body;

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Handle fallback if only name is provided (e.g. from old frontend)
        let fName = firstName;
        let lName = lastName;

        if (!fName && name) {
            const parts = name.split(' ');
            fName = parts[0];
            lName = parts.slice(1).join(' ') || '.';
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            firstName: fName,
            lastName: lName,
            middleInitial,
            // name, // Pre-save handles this
            email,
            password: hashedPassword,
            role: 'staff',
            status: 'active' // Staff created by admin are active by default
        });

        await logAction(req.user.id, 'CREATE_STAFF', `Created staff member ${email}`, req);

        res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status
        });

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get all pending users
// @route   GET /api/users/pending
// @access  Admin
const getPendingUsers = async (req, res) => {
    try {
        const users = await User.find({ status: 'pending' }).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve user
// @route   PUT /api/users/:id/approve
// @access  Admin
const approveUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.status = 'approved';

        // Automatically set student profile status to active if user is a student
        if (!user.studentProfile) {
            user.studentProfile = {
                status: 'active'
            };
        } else {
            user.studentProfile.status = 'active';
        }

        await user.save();

        // Send email
        await sendApprovalEmail(user);

        // Log action
        await logAction(req.user.id, 'APPROVE_USER', `Approved user: ${user.email}`, req);

        res.json({ message: 'User approved and notified' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reject user
// @route   PUT /api/users/:id/reject
// @access  Admin
const rejectUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.status = 'rejected';
        await user.save();

        // Send email
        await sendRejectionEmail(user, req.body.reason);

        // Log action
        await logAction(req.user.id, 'REJECT_USER', `Rejected user: ${user.email}. Reason: ${req.body.reason}`, req);

        res.json({ message: 'User rejected and notified' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Super Admin
const updateUserRole = async (req, res) => {
    const { role } = req.body;

    // Allowed roles to switch to/from
    const allowedRoles = ['manager', 'staff', 'admin'];

    if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
    }

    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent modifying students or super_admins via this route if strictness needed
        // But per request "super admin can only edit the role of the employee not the students"
        if (user.role === 'student') {
            return res.status(400).json({ message: 'Cannot change role of a student' });
        }

        user.role = role;
        await user.save();

        await logAction(req.user.id, 'UPDATE_ROLE', `Updated user ${user.email} role to ${role}`, req);

        res.json({ message: `User role updated to ${role}`, user });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getPendingUsers,
    approveUser,
    rejectUser,
    getStaff,
    createStaff,
    updateUserRole
};
