const express = require('express');
const router = express.Router();
const { createFeedback, getPublicFeedback } = require('../controllers/feedbackController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createFeedback);
router.get('/public', getPublicFeedback);

module.exports = router;
