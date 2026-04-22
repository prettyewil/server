const Task = require('../models/Task');
const User = require('../models/User');
const { createEvent, updateEvent, deleteEvent } = require('../services/googleCalendarService');
const { logAction } = require('../utils/logger');

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Public (or Protected)
const getTasks = async (req, res) => {
    try {
        const tasks = await Task.find().sort({ dueDate: 1 });

        // Filter for students: only show tasks for their room or holidays
        let filteredTasks = tasks;
        if (req.user.role === 'student') {
            const studentStart = new Date(); // Debug start
            // User is already attached to req by protect middleware
            // But we might need to populate studentProfile to get room number if not already present
            // verifying req.user structure... usually it's just the user doc.
            // Let's assume req.user is the full user doc or at least has studentProfile.

            // Re-fetch user if needed to be sure about profile
            // Optimally, protect middleware attaches user.

            const studentRoom = req.user.studentProfile?.roomNumber;

            filteredTasks = tasks.filter(task => {
                // Allow if task is global (if any), or assigned to 'All', or matches student room
                // Also allow holidays (which we append later, but if stored in DB as tasks...)
                if (task.type === 'holiday') return true;
                if (!task.assignedRoom) return false; // Should have a room
                if (task.assignedRoom === 'All') return true;
                return task.assignedRoom === studentRoom;
            });
        }

        let holidayTasks = [];
        try {
            const { listHolidays } = require('../services/googleCalendarService');
            const holidays = await listHolidays();
            holidayTasks = (holidays || []).map((h) => ({
                _id: 'holiday-' + h.start,
                title: h.title,
                type: 'holiday',
                area: 'Global',
                assignedRoom: 'All',
                dueDate: h.start,
                status: 'pending',
                isHoliday: true,
            }));
        } catch (holidayErr) {
            console.error('Skipping holiday merge for tasks:', holidayErr.message);
        }

        res.json([...filteredTasks, ...holidayTasks]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Admin
const createTask = async (req, res) => {
    try {
        const { title, type, area, assignedRoom, dueDate, notes } = req.body;

        // Find students in the room to add as attendees
        const students = await User.find({
            'studentProfile.roomNumber': assignedRoom,
            role: 'student'
        });

        // Find administrative staff so they also see the calendar events
        const staffAndAdmins = await User.find({
            role: { $in: ['admin', 'manager', 'staff'] }
        });

        // Prepare attendee list for Google Calendar
        const attendees = [...students, ...staffAndAdmins].map(u => ({ email: u.email }));

        // Create local task 
        let task = await Task.create({
            title,
            type,
            area,
            assignedRoom,
            dueDate,
            notes
        });

        // Sync with Google Calendar if requested
        if (req.body.syncToCalendar) {
            const taskForGCal = task.toObject();
            taskForGCal.attendees = attendees;

            const googleEventId = await createEvent(taskForGCal);

            if (googleEventId) {
                task.googleEventId = googleEventId;
                await task.save();
            }
        }

        await logAction(req.user.id, 'CREATE_TASK', `Created task '${title}' assigned to Room ${assignedRoom}`, req);

        res.status(201).json(task);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Admin
const updateTask = async (req, res) => {
    try {
        // Separate calendar sync flag from task data
        const { syncToCalendar, ...taskData } = req.body;

        // Only pass valid schema fields to the DB update
        const allowedFields = ['title', 'type', 'area', 'assignedRoom', 'dueDate', 'status', 'notes'];
        const updatePayload = {};
        for (const field of allowedFields) {
            if (taskData[field] !== undefined) {
                updatePayload[field] = taskData[field];
            }
        }

        const task = await Task.findByIdAndUpdate(
            req.params.id,
            updatePayload,
            { new: true }
        );

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (syncToCalendar && !task.googleEventId) {
            // Create event since it wasn't synced before
            const students = await User.find({ 'studentProfile.roomNumber': task.assignedRoom, role: 'student' });
            const staffAndAdmins = await User.find({ role: { $in: ['admin', 'manager', 'staff'] } });
            const taskForGCal = task.toObject();
            taskForGCal.attendees = [...students, ...staffAndAdmins].map(u => ({ email: u.email }));
            const googleEventId = await createEvent(taskForGCal);
            if (googleEventId) {
                task.googleEventId = googleEventId;
                await task.save();
            }
        } else if (syncToCalendar && task.googleEventId) {
            // Update existing event
            const students = await User.find({ 'studentProfile.roomNumber': task.assignedRoom, role: 'student' });
            const staffAndAdmins = await User.find({ role: { $in: ['admin', 'manager', 'staff'] } });
            const taskForGCal = task.toObject();
            taskForGCal.attendees = [...students, ...staffAndAdmins].map(u => ({ email: u.email }));
            await updateEvent(task.googleEventId, taskForGCal);
        } else if (!syncToCalendar && task.googleEventId) {
            // Remove from calendar
            await deleteEvent(task.googleEventId);
            task.googleEventId = undefined;
            await task.save();
        }

        res.json(task);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Admin
const deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Delete from Google Calendar if linked
        if (task.googleEventId) {
            await deleteEvent(task.googleEventId);
        }

        await Task.findByIdAndDelete(req.params.id);

        await logAction(req.user.id, 'DELETE_TASK', `Deleted task '${task.title}'`, req);

        res.json({ message: 'Task removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getTasks,
    createTask,
    updateTask,
    deleteTask
};
