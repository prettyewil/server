const express = require('express');
const router = express.Router();
const violationController = require('../controllers/violationController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

router.use(protect);

// Student: view their own violations
router.get('/my', restrictTo('student'), violationController.getMyViolations);

// Admin/Staff/Manager: full management
router.get('/', restrictTo('admin', 'manager', 'staff'), violationController.getViolations);
router.post('/', restrictTo('admin', 'manager', 'staff'), violationController.createViolation);
router.patch('/:id', restrictTo('admin', 'manager', 'staff'), violationController.updateViolation);
router.delete('/:id', restrictTo('admin', 'manager'), violationController.deleteViolation);

module.exports = router;
