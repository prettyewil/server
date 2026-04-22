const express = require('express');
const router = express.Router();
const {
    getAttendance,
    createAttendance,
    updateAttendance
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

router.route('/')
    .get(protect, restrictTo('admin', 'manager', 'staff'), getAttendance)
    .post(protect, restrictTo('admin', 'manager', 'staff'), createAttendance);

router.route('/:id')
    .put(protect, restrictTo('admin', 'manager', 'staff'), updateAttendance);

module.exports = router;
