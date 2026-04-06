const mongoose = require('mongoose');

const maintenanceRequestSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    urgency: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'low',
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'resolved'],
        default: 'pending',
    },
    roomNumber: {
        type: String,
    },
    googleEventId: {
        type: String,
    },
}, { timestamps: true }); // createdAt is handled by timestamps

module.exports = mongoose.model('MaintenanceRequest', maintenanceRequestSchema);
