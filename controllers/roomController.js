const Room = require('../models/Room');
const User = require('../models/User');

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Public (or Protected based on needs)
const getRooms = async (req, res) => {
    try {
        const rooms = await Room.find().sort({ roomNumber: 1 });

        // Aggregate student counts
        const roomsWithCounts = await Promise.all(rooms.map(async (room) => {
            const count = await User.countDocuments({
                'studentProfile.roomNumber': room.roomNumber,
                'studentProfile.status': 'active' // Optional: only count active students? Assuming active usually.
            });
            return {
                ...room.toObject(),
                students_count: count
            };
        }));

        res.json(roomsWithCounts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Public
const getRoomById = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (room) {
            res.json(room);
        } else {
            res.status(404).json({ message: 'Room not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a room
// @route   POST /api/rooms
// @access  Admin
const createRoom = async (req, res) => {
    const { roomNumber, type, capacity, price, status, features } = req.body;

    try {
        const roomExists = await Room.findOne({ roomNumber });
        if (roomExists) {
            return res.status(400).json({ message: 'Room already exists' });
        }

        const room = await Room.create({
            roomNumber,
            type,
            capacity,
            price,
            status,
            features
        });

        res.status(201).json(room);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a room
// @route   PUT /api/rooms/:id
// @access  Admin
const updateRoom = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);

        if (room) {
            room.roomNumber = req.body.roomNumber || room.roomNumber;
            room.type = req.body.type || room.type;
            room.capacity = req.body.capacity || room.capacity;
            room.price = req.body.price || room.price;
            room.status = req.body.status || room.status;
            room.features = req.body.features || room.features;

            const updatedRoom = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
            res.json(updatedRoom);
        } else {
            res.status(404).json({ message: 'Room not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a room
// @route   DELETE /api/rooms/:id
// @access  Admin
const deleteRoom = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);

        if (room) {
            await Room.deleteOne({ _id: room._id });
            res.json({ message: 'Room removed' });
        } else {
            res.status(404).json({ message: 'Room not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom
};
