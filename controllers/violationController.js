const Violation = require('../models/Violation');
const User = require('../models/User');

// Create a new violation record (Admin/Staff/Manager only)
exports.createViolation = async (req, res) => {
    try {
        const { student, offenseLevel, offense, points, dateOfOffense, notes } = req.body;

        if (!student || !offenseLevel || !offense || points === undefined) {
            return res.status(400).json({ message: 'Student, offense level, offense, and points are required.' });
        }

        const studentUser = await User.findById(student);
        if (!studentUser || studentUser.role !== 'student') {
            return res.status(404).json({ message: 'Student not found.' });
        }

        const violation = new Violation({
            student,
            offenseLevel,
            offense,
            points,
            dateOfOffense: dateOfOffense || Date.now(),
            notes,
            reportedBy: req.user._id,
        });

        await violation.save();

        const populated = await Violation.findById(violation._id)
            .populate('student', 'name studentId studentProfile')
            .populate('reportedBy', 'name');

        res.status(201).json({ message: 'Violation recorded successfully.', violation: populated });
    } catch (error) {
        console.error('Error creating violation:', error);
        res.status(500).json({ message: 'Error creating violation.', error: error.message });
    }
};

// Get all violations (Admin/Staff/Manager) or filtered by student ID
exports.getViolations = async (req, res) => {
    try {
        let query = {};

        if (req.query.studentId) {
            query.student = req.query.studentId;
        }
        if (req.query.status && req.query.status !== 'All') {
            query.status = req.query.status;
        }
        if (req.query.level && req.query.level !== 'All') {
            query.offenseLevel = req.query.level;
        }

        const violations = await Violation.find(query)
            .populate('student', 'name studentId studentProfile')
            .populate('reportedBy', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json(violations);
    } catch (error) {
        console.error('Error fetching violations:', error);
        res.status(500).json({ message: 'Error fetching violations.', error: error.message });
    }
};

// Get violations for the currently logged-in student
exports.getMyViolations = async (req, res) => {
    try {
        const violations = await Violation.find({ student: req.user._id })
            .populate('reportedBy', 'name')
            .sort({ createdAt: -1 });

        const totalPoints = violations
            .reduce((sum, v) => sum + v.points, 0);

        res.status(200).json({ violations, totalPoints });
    } catch (error) {
        console.error('Error fetching student violations:', error);
        res.status(500).json({ message: 'Error fetching violations.', error: error.message });
    }
};

// Update a violation (status, notes, etc.)
exports.updateViolation = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes, offense, points, offenseLevel, dateOfOffense } = req.body;

        const violation = await Violation.findById(id);
        if (!violation) {
            return res.status(404).json({ message: 'Violation not found.' });
        }

        if (status) violation.status = status;
        if (notes !== undefined) violation.notes = notes;
        if (offense) violation.offense = offense;
        if (points !== undefined) violation.points = points;
        if (offenseLevel) violation.offenseLevel = offenseLevel;
        if (dateOfOffense) violation.dateOfOffense = dateOfOffense;

        await violation.save();

        const populated = await Violation.findById(violation._id)
            .populate('student', 'name studentId studentProfile')
            .populate('reportedBy', 'name');

        res.status(200).json({ message: 'Violation updated successfully.', violation: populated });
    } catch (error) {
        console.error('Error updating violation:', error);
        res.status(500).json({ message: 'Error updating violation.', error: error.message });
    }
};

// Delete a violation record
exports.deleteViolation = async (req, res) => {
    try {
        const { id } = req.params;

        const violation = await Violation.findById(id);
        if (!violation) {
            return res.status(404).json({ message: 'Violation not found.' });
        }

        await Violation.findByIdAndDelete(id);
        res.status(200).json({ message: 'Violation deleted successfully.' });
    } catch (error) {
        console.error('Error deleting violation:', error);
        res.status(500).json({ message: 'Error deleting violation.', error: error.message });
    }
};
