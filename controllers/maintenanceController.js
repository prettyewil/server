const MaintenanceRequest = require('../models/MaintenanceRequest');

// @desc    Get all maintenance requests
// @route   GET /api/maintenance
// @access  Private (Admin)
const getMaintenanceRequests = async (req, res) => {
    try {
        const requests = await MaintenanceRequest.find()
            .populate('student', 'name email studentProfile.roomNumber')
            .sort({ createdAt: -1 });
        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get my maintenance requests
// @route   GET /api/maintenance/my-requests
// @access  Private (Student)
const getMyRequests = async (req, res) => {
    try {
        const requests = await MaintenanceRequest.find({ student: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a maintenance request
// @route   POST /api/maintenance
// @access  Private (Student)
const createRequest = async (req, res) => {
    const { title, description, urgency } = req.body;

    try {
        const request = await MaintenanceRequest.create({
            student: req.user.id,
            title,
            description,
            urgency,
            roomNumber: req.user.studentProfile ? req.user.studentProfile.roomNumber : 'Unknown', // Auto-populate
        });

        res.status(201).json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update maintenance request status
// @route   PATCH /api/maintenance/:id/status
// @access  Private (Admin)
const updateRequestStatus = async (req, res) => {
    const { status } = req.body;

    try {
        const request = await MaintenanceRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        request.status = status;
        const updatedRequest = await request.save();
        res.status(200).json(updatedRequest);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a maintenance request
// @route   DELETE /api/maintenance/:id
// @access  Private (Admin)
const deleteRequest = async (req, res) => {
    try {
        const request = await MaintenanceRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // Check ownership if student
        if (req.user.role === 'student' && request.student.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this request' });
        }

        await request.deleteOne();
        res.status(200).json({ message: 'Request removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getMaintenanceRequests,
    getMyRequests,
    createRequest,
    updateRequestStatus,
    deleteRequest,
};
