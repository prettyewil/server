const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['cleaning', 'maintenance', 'inspection', 'other'],
        default: 'cleaning'
    },
    area: {
        type: String,
        required: true
    },
    assignedRoom: {
        type: String,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending'
    },
    notes: {
        type: String
    },
    googleEventId: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Task', taskSchema);
