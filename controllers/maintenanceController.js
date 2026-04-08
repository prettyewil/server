const MaintenanceRequest = require('../models/MaintenanceRequest');
const { createEvent, updateEvent, deleteEvent } = require('../services/googleCalendarService');
const { logAction } = require('../utils/logger');

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
    const { title, description, urgency, student_id } = req.body;

    if (!title || !title.trim() || !description || !description.trim()) {
        return res.status(400).json({ message: 'Title and description are required' });
    }

    try {
        let studentId = req.user.id;
        let roomNumber = req.user.studentProfile ? req.user.studentProfile.roomNumber : 'Unknown';

        // Helper to check if user has admin privileges
        const isAdmin = ['admin', 'manager', 'super_admin'].includes(req.user.role);

        let reqEmail = req.user.email;
        if (isAdmin && student_id) {
            const User = require('../models/User');
            const targetStudent = await User.findById(student_id);
            if (!targetStudent) {
                return res.status(404).json({ message: 'Student not found' });
            }
            studentId = student_id;
            roomNumber = targetStudent.studentProfile ? targetStudent.studentProfile.roomNumber : 'Unknown';
            reqEmail = targetStudent.email;
        }

        const request = await MaintenanceRequest.create({
            student: studentId,
            title,
            description,
            urgency,
            roomNumber,
        });

        if (req.body.syncToCalendar) {
            const taskForGCal = {
                title: `Maintenance: ${title}`,
                type: 'Maintenance',
                area: 'Dorm',
                assignedRoom: roomNumber,
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                notes: description,
                attendees: [{ email: reqEmail }]
            };
            const googleEventId = await createEvent(taskForGCal);
            if (googleEventId) {
                request.googleEventId = googleEventId;
                await request.save();
            }
        }
        
        await logAction(req.user.id, 'CREATE_MAINTENANCE', `Created maintenance request '${title}'`, req);

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
        
        // Update Calendar if event exists
        if (updatedRequest.googleEventId) {
            const User = require('../models/User');
            const targetStudent = await User.findById(updatedRequest.student);
            const taskForGCal = {
                title: `Maintenance: ${updatedRequest.title} [${status.toUpperCase()}]`,
                type: 'Maintenance',
                area: 'Dorm',
                assignedRoom: updatedRequest.roomNumber,
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                notes: updatedRequest.description,
                attendees: targetStudent ? [{ email: targetStudent.email }] : []
            };
            await updateEvent(updatedRequest.googleEventId, taskForGCal);
        }

        await logAction(req.user.id, 'UPDATE_MAINTENANCE_STATUS', `Updated maintenance request status to '${status}' for: ${updatedRequest.title}`, req);

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

        if (request.googleEventId) {
            await deleteEvent(request.googleEventId);
        }

        await request.deleteOne();
        await logAction(req.user.id, 'DELETE_MAINTENANCE', `Deleted maintenance request '${request.title}'`, req);
        res.status(200).json({ message: 'Request removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a maintenance request
// @route   PUT /api/maintenance/:id
// @access  Private (Admin/Student)
const updateRequest = async (req, res) => {
    try {
        const { title, description, urgency, status, syncToCalendar } = req.body;
        const request = await MaintenanceRequest.findById(req.params.id).populate('student', 'email');

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        request.title = title || request.title;
        request.description = description || request.description;
        request.urgency = urgency || request.urgency;
        if (status) request.status = status;

        await request.save();

        const reqEmail = request.student ? request.student.email : req.user.email;
        const taskForGCal = {
            title: `Maintenance: ${request.title} [${request.status.toUpperCase()}]`,
            type: 'Maintenance',
            area: 'Dorm',
            assignedRoom: request.roomNumber,
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            notes: request.description,
            attendees: [{ email: reqEmail }]
        };

        if (syncToCalendar && !request.googleEventId) {
            const googleEventId = await createEvent(taskForGCal);
            if (googleEventId) {
                request.googleEventId = googleEventId;
                await request.save();
            }
        } else if (syncToCalendar && request.googleEventId) {
            await updateEvent(request.googleEventId, taskForGCal);
        } else if (!syncToCalendar && request.googleEventId) {
            await deleteEvent(request.googleEventId);
            request.googleEventId = undefined;
            await request.save();
        }

        await logAction(req.user.id, 'UPDATE_MAINTENANCE', `Updated maintenance request '${request.title}'`, req);
        res.status(200).json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getMaintenanceRequests,
    getMyRequests,
    createRequest,
    updateRequestStatus,
    updateRequest,
    deleteRequest,
};
