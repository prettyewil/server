const express = require('express');
const router = express.Router();
const {
    getStudents,
    createStudent,
    updateStudent,
    deleteStudent
} = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');

const { restrictTo } = require('../middleware/roleMiddleware');

router.route('/')
    .get(protect, restrictTo('admin', 'manager', 'staff'), getStudents)
    .post(protect, restrictTo('admin', 'manager'), createStudent);

router.route('/:id')
    .put(protect, restrictTo('admin', 'manager'), updateStudent)
    .delete(protect, restrictTo('admin', 'manager'), deleteStudent);

module.exports = router;
