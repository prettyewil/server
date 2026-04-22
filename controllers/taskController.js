const Task = require('../models/Task');
const User = require('../models/User');
const { logAction } = require('../utils/logger');

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Public (or Protected)
const getTasks = async (req, res) => {
    try {
        const tasks = await Task.find().sort({ dueDate: 1 });
        res.json(tasks);
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

        // Create local task 
        let task = await Task.create({
            title,
            type,
            area,
            assignedRoom,
            dueDate,
            notes
        });

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
        const taskData = req.body;

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

        await logAction(req.user.id, 'UPDATE_TASK', `Updated task '${task.title}'`, req);

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
