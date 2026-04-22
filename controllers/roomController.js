const Room = require('../models/Room');
const User = require('../models/User');
const { logAction } = require('../utils/logger');

// Helper to get room with occupants
const getRoomWithOccupants = async (room) => {
    const users = await User.find({
        'studentProfile.roomNumber': room.roomNumber,
        'status': { $ne: 'rejected' },
        'studentProfile.status': { $in: ['active', 'inactive'] }
    }).select('name firstName lastName middleInitial studentProfile.status');
    
    let effectiveStatus = room.status;
    
    // Auto-update status based on occupancy (unless under Maintenance)
    if (room.status !== 'Maintenance') {
        if (users.length >= room.capacity) {
            effectiveStatus = 'Occupied';
        } else {
            effectiveStatus = 'Available';
        }
    }

    // If the logical status differs from DB, update the DB asynchronously
    if (effectiveStatus !== room.status) {
        Room.findByIdAndUpdate(room._id, { status: effectiveStatus }).exec().catch(err => console.error('Error auto-syncing room status:', err));
    }

    return {
        ...room.toObject(),
        status: effectiveStatus,
        students_count: users.length,
        student_names: users.map(u => {
            if (u.fullName) return u.fullName;
            if (u.name) return u.name;
            if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`;
            return 'Unknown Student';
        })
    };
};

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Public (or Protected based on needs)
const getRooms = async (req, res) => {
    try {
        const rooms = await Room.find().sort({ roomNumber: 1 });

        const roomsWithCounts = await Promise.all(rooms.map(room => getRoomWithOccupants(room)));

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

        await logAction(req.user.id, 'CREATE_ROOM', `Created room ${roomNumber}`, req);

        const populatedRoom = await getRoomWithOccupants(room);
        res.status(201).json(populatedRoom);
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
            
            await logAction(req.user.id, 'UPDATE_ROOM', `Updated room ${updatedRoom.roomNumber}`, req);
            
            const populatedRoom = await getRoomWithOccupants(updatedRoom);
            res.json(populatedRoom);
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
            await logAction(req.user.id, 'DELETE_ROOM', `Deleted room ${room.roomNumber}`, req);
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
