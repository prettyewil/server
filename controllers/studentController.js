const User = require('../models/User');
const Room = require('../models/Room');
const { logAction } = require('../utils/logger');
const bcrypt = require('bcryptjs');

// @desc    Get all students
// @route   GET /api/students
// @access  Private (Admin/Student for dropdowns)
const getStudents = async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).select('-password').sort({ name: 1 });
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new student
// @route   POST /api/students
// @access  Admin
const createStudent = async (req, res) => {
    const { student_id, first_name, last_name, email, room_id, status } = req.body;

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
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
            name: `${first_name} ${last_name}`,
            email,
            password: hashedPassword,
            role: 'student',
            studentId: student_id,
            studentProfile: {
                roomNumber: roomNumber,
                status: status || 'inactive'
            }
        });

        // Log creation
        await logAction(req.user.id, 'CREATE_STUDENT', `Created student ${email}`, req);

        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Admin
const updateStudent = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'Student not found' });
        }

        user.name = `${req.body.first_name || user.name.split(' ')[0]} ${req.body.last_name || user.name.split(' ')[1]}`;
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
        }

        const updatedUser = await user.save();

        // Log update
        await logAction(req.user.id, 'UPDATE_STUDENT', `Updated student ${user.email}`, req);

        res.json(updatedUser);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Admin
const deleteStudent = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        // Log deletion
        if (user) {
            await logAction(req.user.id, 'DELETE_STUDENT', `Deleted student ${user.email}`, req);
        }

        res.json({ message: 'Student removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getStudents,
    createStudent,
    updateStudent,
    deleteStudent
};
