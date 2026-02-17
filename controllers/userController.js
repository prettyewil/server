const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { sendApprovalEmail, sendRejectionEmail } = require('../services/emailService');
const { logAction } = require('../utils/logger');
const bcrypt = require('bcryptjs');

// @desc    Get all staff
// @route   GET /api/users/staff
// @access  Admin
const getStaff = asyncHandler(async (req, res) => {
    const staff = await User.find({ role: { $in: ['staff', 'admin', 'manager'] } }).select('-password').sort({ lastName: 1, firstName: 1 });
    res.json(staff);
});

// @desc    Create a new staff member
// @route   POST /api/users/staff
// @access  Admin
const createStaff = asyncHandler(async (req, res) => {
    // Expect split fields
    const { firstName, lastName, middleInitial, name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
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
});

// @desc    Get all pending users
// @route   GET /api/users/pending
// @access  Admin
const getPendingUsers = asyncHandler(async (req, res) => {
    // Fetch both pending and unverified students
    const users = await User.find({ status: { $in: ['pending', 'unverified'] }, role: 'student' }).select('-password');
    res.json(users);
});

// @desc    Approve user
// @route   PUT /api/users/:id/approve
// @access  Admin
const approveUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
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
});

// @desc    Reject user
// @route   PUT /api/users/:id/reject
// @access  Admin
const rejectUser = asyncHandler(async (req, res) => {
    console.log('REJECT USER START:', req.params.id); // DEBUG
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    user.status = 'rejected';
    await user.save();

    // Send email
    try {
        const reason = req.body && req.body.reason ? req.body.reason : 'No specific reason provided.';
        console.log('Sending rejection email to:', user.email); // DEBUG
        await sendRejectionEmail(user, reason);
        console.log('Rejection email sent successfully'); // DEBUG
    } catch (emailError) {
        console.error('FAILED TO SEND REJECTION EMAIL:', emailError);
        // Do not crash the request, just log it? Or throw?
        // If we want to return 500 on email failure, we let it throw.
        // But maybe we should handle it gracefully?
        // For debugging, let's log explicitly.
    }

    // Log action
    const reasonLog = req.body && req.body.reason ? req.body.reason : 'No reason provided';
    await logAction(req.user.id, 'REJECT_USER', `Rejected user: ${user.email}. Reason: ${reasonLog}`, req);

    res.json({ message: 'User rejected and notified' });
});

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Super Admin
const updateUserRole = asyncHandler(async (req, res) => {
    const { role } = req.body;

    // Allowed roles to switch to/from
    const allowedRoles = ['manager', 'staff', 'admin'];

    if (!allowedRoles.includes(role)) {
        res.status(400);
        throw new Error('Invalid role');
    }

    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Prevent modifying students or super_admins via this route if strictness needed
    // But per request "super admin can only edit the role of the employee not the students"
    if (user.role === 'student') {
        res.status(400);
        throw new Error('Cannot change role of a student');
    }

    user.role = role;
    await user.save();

    await logAction(req.user.id, 'UPDATE_ROLE', `Updated user ${user.email} role to ${role}`, req);

    res.json({ message: `User role updated to ${role}`, user });
});

// @desc    Get student history (attendance, payments, maintenance)
// @route   GET /api/users/:id/history
// @access  Admin, Manager, Super Admin
const getStudentHistory = asyncHandler(async (req, res) => {
    const studentId = req.params.id;

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student) {
        res.status(404);
        throw new Error('Student not found');
    }

    // Fetch all related data in parallel
    const [attendance, payments, maintenance] = await Promise.all([
        require('../models/Attendance').find({ student: studentId }).sort({ date: -1 }),
        require('../models/Payment').find({ student: studentId }).select('-receiptData').sort({ createdAt: -1 }),
        require('../models/MaintenanceRequest').find({ student: studentId }).sort({ createdAt: -1 })
    ]);

    res.json({
        student: {
            _id: student._id,
            name: student.name,
            email: student.email,
            roomNumber: student.studentProfile?.roomNumber
        },
        attendance,
        payments,
        maintenance
    });
});

const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    await user.deleteOne();
    res.json({ message: 'User removed' });
});

module.exports = {
    getPendingUsers,
    approveUser,
    rejectUser,
    getStaff,
    createStaff,
    updateUserRole,
    getStudentHistory,
    deleteUser
};
