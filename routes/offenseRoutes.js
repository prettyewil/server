const express = require('express');
const router = express.Router();
const { getOffenses, createOffense, deleteOffense } = require('../controllers/offenseController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

router.route('/')
    .get(protect, getOffenses)
    .post(protect, restrictTo('admin', 'manager', 'staff'), createOffense);

router.route('/:id')
    .delete(protect, restrictTo('admin', 'manager', 'staff'), deleteOffense);

module.exports = router;
