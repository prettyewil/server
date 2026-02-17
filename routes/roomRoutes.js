const express = require('express');
const router = express.Router();
const {
    getRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom
} = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

router.route('/')
    .get(getRooms)
    .post(protect, restrictTo('admin', 'manager', 'super_admin'), createRoom);

router.route('/:id')
    .get(getRoomById)
    .put(protect, restrictTo('admin', 'manager', 'super_admin'), updateRoom)
    .delete(protect, restrictTo('admin', 'manager', 'super_admin'), deleteRoom);

module.exports = router;
