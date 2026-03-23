const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    action: {
        type: String,
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed, // Can be string or object
        default: ''
    },
    ipAddress: {
        type: String,
        default: 'Unknown'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SystemLog', systemLogSchema);
