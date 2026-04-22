const express = require('express');
const router = express.Router();
const {
    getTasks,
    createTask,
    updateTask,
    deleteTask
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

router.route('/')
    .get(protect, restrictTo('admin', 'manager', 'staff', 'student'), getTasks)
    .post(protect, restrictTo('admin', 'manager'), createTask);

router.route('/:id')
    .put(protect, restrictTo('admin', 'manager'), updateTask)
    .delete(protect, restrictTo('admin', 'manager'), deleteTask);

module.exports = router;
