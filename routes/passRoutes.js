const express = require('express');
const router = express.Router();
const passController = require('../controllers/passController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

router.use(protect);

router.post('/', restrictTo('student'), passController.createPass);
router.get('/', passController.getPasses);
router.patch('/:id/status', restrictTo('admin', 'manager', 'staff'), passController.updatePassStatus);
router.delete('/:id', passController.deletePass);

module.exports = router;
