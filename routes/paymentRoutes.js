const express = require('express');
const router = express.Router();
const {
    getPayments,
    getMyHistory,
    createPayment,
    updatePaymentStatus,
    getPaymentReceipt,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', protect, restrictTo('admin', 'manager', 'super_admin'), getPayments);
router.get('/my-history', protect, restrictTo('student'), getMyHistory);
router.post('/', protect, restrictTo('admin', 'manager', 'super_admin'), createPayment);
// Support both PATCH and PUT (for legacy/stale clients)
router.patch('/:id', protect, restrictTo('admin', 'manager', 'super_admin', 'student'), upload.single('receipt_image'), updatePaymentStatus);
router.put('/:id', protect, restrictTo('admin', 'manager', 'super_admin', 'student'), upload.single('receipt_image'), updatePaymentStatus);
router.get('/:id/receipt', getPaymentReceipt);

module.exports = router;
