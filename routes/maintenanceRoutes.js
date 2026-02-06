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

router.get('/', protect, restrictTo('admin'), getMaintenanceRequests);
router.get('/my-requests', protect, restrictTo('student'), getMyRequests);
router.post('/', protect, restrictTo('student'), createRequest);
router.patch('/:id/status', protect, restrictTo('admin'), updateRequestStatus);
router.delete('/:id', protect, restrictTo('admin', 'student'), deleteRequest);

module.exports = router;
