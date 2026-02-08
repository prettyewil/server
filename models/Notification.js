const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['info', 'success', 'warning', 'error'],
        default: 'info'
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        // Dynamic reference could be Payment, MaintenanceRequest, etc.
    },
    onModel: {
        type: String,
        enum: ['Payment', 'MaintenanceRequest', 'User', 'Announcement'],
        default: 'Payment'
    },
    read: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
