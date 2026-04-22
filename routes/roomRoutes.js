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
    .post(protect, restrictTo('admin', 'manager'), createRoom);

router.route('/:id')
    .get(getRoomById)
    .put(protect, restrictTo('admin', 'manager'), updateRoom)
    .delete(protect, restrictTo('admin', 'manager'), deleteRoom);

module.exports = router;
