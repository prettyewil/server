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
    .get(protect, getTasks)
    .post(protect, restrictTo('admin'), createTask);

router.route('/:id')
    .put(protect, restrictTo('admin'), updateTask)
    .delete(protect, restrictTo('admin'), deleteTask);

module.exports = router;
