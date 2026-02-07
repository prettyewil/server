const express = require('express');
const router = express.Router();
const {
    getMaintenanceRequests,
    getMyRequests,
    createRequest,
    updateRequestStatus,
    deleteRequest,
} = require('../controllers/maintenanceController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

router.get('/', protect, restrictTo('admin', 'manager', 'super_admin', 'staff'), getMaintenanceRequests);
router.get('/my-requests', protect, restrictTo('student'), getMyRequests);
router.post('/', protect, restrictTo('student'), createRequest);
router.patch('/:id/status', protect, restrictTo('admin', 'manager', 'super_admin', 'staff'), updateRequestStatus);
router.delete('/:id', protect, restrictTo('admin', 'manager', 'super_admin', 'student'), deleteRequest);

module.exports = router;
