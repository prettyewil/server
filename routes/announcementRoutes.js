const express = require('express');
const router = express.Router();
const { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } = require('../controllers/announcementController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

router.get('/', protect, getAnnouncements);
router.post('/', protect, restrictTo('admin', 'manager'), createAnnouncement);
router.put('/:id', protect, restrictTo('admin', 'manager'), updateAnnouncement);
router.delete('/:id', protect, restrictTo('admin', 'manager'), deleteAnnouncement);

module.exports = router;
