const express = require('express');
const router = express.Router();
const { createFeedback, getPublicFeedback, getAllFeedback, checkFeedbackStatus } = require('../controllers/feedbackController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

router.post('/', protect, createFeedback);
router.get('/status', protect, checkFeedbackStatus);
router.get('/public', getPublicFeedback);
router.get('/all', protect, restrictTo('admin', 'manager'), getAllFeedback);

module.exports = router;
