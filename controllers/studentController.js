const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Room = require('../models/Room');
const { logAction } = require('../utils/logger');
const bcrypt = require('bcryptjs');

// @desc    Get all students
// @route   GET /api/students
// @access  Private (Admin/Student for dropdowns)
const getStudents = asyncHandler(async (req, res) => {
    const students = await User.find({ role: 'student', status: { $in: ['approved', 'active'] } }).select('-password').sort({ lastName: 1, firstName: 1 });
    res.json(students);
});

// @desc    Create a new student
// @route   POST /api/students
// @access  Admin
const createStudent = asyncHandler(async (req, res) => {
    const { student_id, first_name, last_name, email, room_id, status } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Fetch room details if room_id is provided
    let roomNumber = 'N/A';
    if (room_id) {
        const room = await Room.findById(room_id);
        if (room) {
            roomNumber = room.roomNumber;
        }
    }

    // Generate default password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt); // Default password

    const user = await User.create({
        firstName: first_name,
        lastName: last_name,
        middleInitial: req.body.middle_initial,
        // name: `${first_name} ${last_name}`, // Handled by pre-save
        email,
        password: hashedPassword,
        role: 'student',
        studentId: student_id,
        studentProfile: {
            roomNumber: roomNumber,
            enrollmentDate: req.body.enrollment_date || new Date(),
            status: status || 'inactive'
        }
    });

    // Log creation
    await logAction(req.user.id, 'CREATE_STUDENT', `Created student ${email}`, req);

    res.status(201).json(user);
});

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Admin
const updateStudent = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        res.status(404);
        throw new Error('Student not found');
    }

    if (req.body.first_name) user.firstName = req.body.first_name;
    if (req.body.last_name) user.lastName = req.body.last_name;
    if (req.body.middle_initial !== undefined) user.middleInitial = req.body.middle_initial; // Allow clearing?

    // Fallback for name update if needed, but we prefer specific fields.
    // user.name = ... // Handled by pre-save
    user.email = req.body.email || user.email;

    // Update user.studentId if provided (and maybe check uniqueness if not handled by mongoose)
    if (req.body.student_id) {
        user.studentId = req.body.student_id;
    }

    if (user.studentProfile) {
        user.studentProfile.status = req.body.status || user.studentProfile.status;

        // Update Room if room_id provided
        if (req.body.room_id) {
            const room = await Room.findById(req.body.room_id);
            if (room) {
                user.studentProfile.roomNumber = room.roomNumber;
            }
        }

        // Sync user account status with profile status
        if (user.studentProfile.status === 'active') {
            user.status = 'approved';
        } else if (user.studentProfile.status === 'inactive') {
            user.status = 'pending'; // or 'rejected' depending on preference, but pending disables login effectively
        }

        // Update other fields as needed
        if (req.body.phone_number) user.studentProfile.phoneNumber = req.body.phone_number;
        if (req.body.enrollment_date) user.studentProfile.enrollmentDate = req.body.enrollment_date;
    }

    const updatedUser = await user.save();

    // Log update
    await logAction(req.user.id, 'UPDATE_STUDENT', `Updated student ${user.email}`, req);

    res.json(updatedUser);
});

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Admin
const deleteStudent = asyncHandler(async (req, res) => {
    const user = await User.findByIdAndDelete(req.params.id);

    // Log deletion
    if (user) {
        await logAction(req.user.id, 'DELETE_STUDENT', `Deleted student ${user.email}`, req);
    }

    res.json({ message: 'Student removed' });
});

module.exports = {
    getStudents,
    createStudent,
    updateStudent,
    deleteStudent
};
