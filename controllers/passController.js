const Pass = require('../models/Pass');
const User = require('../models/User');

// Create a new pass request
exports.createPass = async (req, res) => {
    try {
        const { passType, reason, startDate, endDate } = req.body;
        const studentId = req.user._id;

        const newPass = new Pass({
            student: studentId,
            passType,
            reason,
            startDate,
            endDate,
        });

        await newPass.save();
        res.status(201).json({ message: 'Pass request created successfully', pass: newPass });
    } catch (error) {
        res.status(500).json({ message: 'Error creating pass request', error: error.message });
    }
};

// Get passes (Admin gets all, Student gets their own)
exports.getPasses = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'student') {
            query.student = req.user._id;
        }

        const passes = await Pass.find(query)
            .populate('student', 'name studentId studentProfile')
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json(passes);
    } catch (error) {
        console.error('Error fetching passes:', error);
        res.status(500).json({ 
            message: 'Error fetching passes', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        });
    }
};

// Update pass status (Approve/Reject)
exports.updatePassStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;
        const adminId = req.user._id;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const pass = await Pass.findById(id);
        if (!pass) {
            return res.status(404).json({ message: 'Pass not found' });
        }

        pass.status = status;
        pass.approvedBy = adminId;
        if (status === 'rejected') {
            pass.rejectionReason = rejectionReason;
        }

        await pass.save();
        res.status(200).json({ message: `Pass ${status} successfully`, pass });
    } catch (error) {
        res.status(500).json({ message: 'Error updating pass status', error: error.message });
    }
};

// Delete a pass request (Only if pending)
exports.deletePass = async (req, res) => {
    try {
        const { id } = req.params;
        const pass = await Pass.findById(id);

        if (!pass) {
            return res.status(404).json({ message: 'Pass not found' });
        }

        if (pass.student.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (pass.status !== 'pending' && req.user.role !== 'admin') {
            return res.status(400).json({ message: 'Cannot delete a processed pass' });
        }

        await Pass.findByIdAndDelete(id);
        res.status(200).json({ message: 'Pass request deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting pass request', error: error.message });
    }
};
