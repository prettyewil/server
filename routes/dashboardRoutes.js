const express = require('express');
const router = express.Router();
const { getAdminStats, getStudentStats } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

router.get('/admin/stats', protect, restrictTo('admin', 'manager', 'super_admin', 'staff'), getAdminStats);
router.get('/student/stats', protect, restrictTo('student'), getStudentStats);

module.exports = router;
