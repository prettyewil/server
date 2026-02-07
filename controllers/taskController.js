const Task = require('../models/Task');
const User = require('../models/User');
const { createEvent, deleteEvent } = require('../services/googleCalendarService');
const { logAction } = require('../utils/logger');

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Public (or Protected)
const getTasks = async (req, res) => {
    try {
        const tasks = await Task.find().sort({ dueDate: 1 });

        // Fetch holidays
        const { listHolidays } = require('../services/googleCalendarService');
        const holidays = await listHolidays();
        console.log(`Fetched ${holidays.length} holidays`); // Debug log

        // Transform holidays to match Task structure roughly
        const holidayTasks = holidays.map(h => ({
            _id: 'holiday-' + h.start,
            title: h.title,
            type: 'holiday',
            area: 'Global',
            assignedRoom: 'All',
            dueDate: h.start,
            status: 'pending', // or 'info'
            isHoliday: true
        }));

        res.json([...tasks, ...holidayTasks]);
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

        // Prepare attendee list for Google Calendar
        const attendees = students.map(s => ({ email: s.email }));

        // Create local task 
        let task = await Task.create({
            title,
            type,
            area,
            assignedRoom,
            dueDate,
            notes
        });

        // Sync with Google Calendar
        // Attach attendees to task object for service to use (not stored in DB, strictly for GCal)
        const taskForGCal = task.toObject();
        taskForGCal.attendees = attendees;

        const googleEventId = await createEvent(taskForGCal);

        if (googleEventId) {
            task.googleEventId = googleEventId;
            await task.save();
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
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        // Note: Full sync update to Google Calendar would happen here

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
