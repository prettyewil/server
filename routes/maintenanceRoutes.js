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

router.get('/', protect, restrictTo('admin', 'manager', 'staff'), getMaintenanceRequests);
router.get('/my-requests', protect, restrictTo('student'), getMyRequests);
router.post('/', protect, restrictTo('student', 'admin', 'manager'), createRequest);
router.put('/:id', protect, restrictTo('student', 'admin', 'manager', 'staff'), updateRequest);
router.patch('/:id/status', protect, restrictTo('admin', 'manager', 'staff'), updateRequestStatus);
router.delete('/:id', protect, restrictTo('admin', 'manager', 'student'), deleteRequest);

module.exports = router;
