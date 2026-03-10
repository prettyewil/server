const express = require('express');
const router = express.Router();
const { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } = require('../controllers/announcementController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

router.get('/', protect, getAnnouncements);
router.post('/', protect, restrictTo('admin', 'manager', 'super_admin'), createAnnouncement);
router.put('/:id', protect, restrictTo('admin', 'manager', 'super_admin'), updateAnnouncement);
router.delete('/:id', protect, restrictTo('admin', 'manager', 'super_admin'), deleteAnnouncement);

module.exports = router;
