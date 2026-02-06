const Attendance = require('../models/Attendance');

// @desc    Get all attendance logs
// @route   GET /api/attendance
// @access  Public/Admin
const getAttendance = async (req, res) => {
    try {
        const { date } = req.query;
        let query = {};

        if (date) {
            query.date = date; // Expecting YYYY-MM-DD string match or similar
            // If date is stored as Date object, we might need range query.
            // But let's assume string or specific match for now based on how it's sent.
            // If it's a date string, we might need a range for the whole day.
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            // Actually the schema probably stores date as Date or String?
            // Let's check the schema first.
        }

        const logs = await Attendance.find(query).sort({ date: -1 }).populate('student', 'name email studentProfile');
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create attendance log
// @route   POST /api/attendance
// @access  Admin
const createAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.create(req.body);
        res.status(201).json(attendance);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update attendance
// @route   PUT /api/attendance/:id
// @access  Admin
const updateAttendance = async (req, res) => {
    try {
        const updatedAttendance = await Attendance.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(updatedAttendance);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    getAttendance,
    createAttendance,
    updateAttendance
};
