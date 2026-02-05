const express = require('express');
const router = express.Router();
const {
    getPayments,
    getMyHistory,
    createPayment,
    updatePaymentStatus,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

router.get('/', protect, restrictTo('admin'), getPayments);
router.get('/my-history', protect, restrictTo('student'), getMyHistory);
router.post('/', protect, restrictTo('admin'), createPayment);
router.patch('/:id', protect, restrictTo('admin'), updatePaymentStatus);

module.exports = router;
