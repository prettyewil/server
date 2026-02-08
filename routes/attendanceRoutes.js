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
    .get(protect, getAttendance)
    .post(protect, restrictTo('admin', 'super_admin', 'staff'), createAttendance);

router.route('/:id')
    .put(protect, restrictTo('admin', 'super_admin', 'staff'), updateAttendance);

module.exports = router;
