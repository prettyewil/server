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
    .get(protect, restrictTo('admin', 'manager', 'super_admin', 'staff'), getStudents)
    .post(protect, restrictTo('admin', 'manager', 'super_admin'), createStudent);

router.route('/:id')
    .put(protect, restrictTo('admin', 'manager', 'super_admin'), updateStudent)
    .delete(protect, restrictTo('admin', 'manager', 'super_admin'), deleteStudent);

module.exports = router;
