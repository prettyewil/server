const express = require('express');
const router = express.Router();
const {
    getPayments,
    getMyHistory,
    createPayment,
    createBulkPayment,
    updatePaymentStatus,
    getPaymentReceipt,
    deletePayment,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', protect, restrictTo('admin', 'manager'), getPayments);
router.get('/my-history', protect, restrictTo('student'), getMyHistory);
router.post('/', protect, restrictTo('admin', 'manager'), createPayment);
router.post('/bulk', protect, restrictTo('admin', 'manager'), createBulkPayment);
router.delete('/:id', protect, restrictTo('admin', 'manager'), deletePayment);
// Support both PATCH and PUT (for legacy/stale clients)
router.patch('/:id', protect, restrictTo('admin', 'manager', 'student'), upload.single('receipt_image'), updatePaymentStatus);
router.put('/:id', protect, restrictTo('admin', 'manager', 'student'), upload.single('receipt_image'), updatePaymentStatus);
router.get('/:id/receipt', getPaymentReceipt);

module.exports = router;
