const mongoose = require('mongoose');

const passSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    passType: {
        type: String,
        enum: ['Going home', 'Late night pass', 'Overnight'],
        required: true,
    },
    reason: {
        type: String,
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    rejectionReason: {
        type: String,
    },
}, { timestamps: true });

module.exports = mongoose.models.Pass || mongoose.model('Pass', passSchema);
