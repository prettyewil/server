const express = require('express');
const router = express.Router();
const { getPendingUsers, approveUser, rejectUser, getStaff, createStaff, updateUserRole } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

router.use(protect);

// Routes accessible by Admin, Manager, Super Admin
// We need to clarify "manager can access all module just like admin"
// So standard admin routes should be accessible by 'admin', 'manager', 'super_admin'

router.get('/pending', restrictTo('admin', 'manager', 'super_admin'), getPendingUsers);
router.put('/:id/approve', restrictTo('admin', 'manager', 'super_admin'), approveUser);
router.put('/:id/reject', restrictTo('admin', 'manager', 'super_admin'), rejectUser);

// Staff Management
router.get('/staff', restrictTo('admin', 'manager', 'super_admin'), getStaff);
router.post('/staff', restrictTo('admin', 'manager', 'super_admin'), createStaff);

// Super Admin Only
router.put('/:id/role', restrictTo('super_admin'), updateUserRole);

module.exports = router;
