const express = require('express');
const router = express.Router();
const { getPendingUsers, approveUser, rejectUser, getStaff, createStaff, updateUserRole } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

router.use(protect);

// Routes accessible by Admin, Manager
// We need to clarify "manager can access all module just like admin"
// So standard admin routes should be accessible by 'admin', 'manager'

router.get('/pending', restrictTo('admin', 'manager'), getPendingUsers);
router.put('/:id/approve', restrictTo('admin', 'manager'), approveUser);
router.put('/:id/reject', restrictTo('admin', 'manager'), rejectUser);
router.get('/:id/history', restrictTo('admin', 'manager'), require('../controllers/userController').getStudentHistory);

// Staff Management
router.get('/staff', restrictTo('admin'), getStaff);
router.post('/staff', restrictTo('admin'), createStaff);

// Admin only
router.put('/:id/role', restrictTo('admin'), updateUserRole);
router.delete('/:id', restrictTo('admin', 'manager'), require('../controllers/userController').deleteUser);

module.exports = router;
