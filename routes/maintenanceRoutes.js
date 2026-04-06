const express = require('express');
const router = express.Router();
const {
    getMaintenanceRequests,
    getMyRequests,
    createRequest,
    updateRequestStatus,
    updateRequest,
    deleteRequest,
} = require('../controllers/maintenanceController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

router.get('/', protect, restrictTo('admin', 'manager', 'super_admin', 'staff'), getMaintenanceRequests);
router.get('/my-requests', protect, restrictTo('student'), getMyRequests);
router.post('/', protect, restrictTo('student', 'admin', 'manager', 'super_admin'), createRequest);
router.put('/:id', protect, restrictTo('student', 'admin', 'manager', 'super_admin', 'staff'), updateRequest);
router.patch('/:id/status', protect, restrictTo('admin', 'manager', 'super_admin', 'staff'), updateRequestStatus);
router.delete('/:id', protect, restrictTo('admin', 'manager', 'super_admin', 'student'), deleteRequest);

module.exports = router;
