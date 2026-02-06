const express = require('express');
const router = express.Router();
const { getPendingUsers, approveUser, rejectUser, getStaff, createStaff } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(restrictTo('admin'));

router.get('/pending', getPendingUsers);
router.put('/:id/approve', approveUser);
router.put('/:id/reject', rejectUser);

// Staff Management
router.get('/staff', getStaff);
router.post('/staff', createStaff);

module.exports = router;
