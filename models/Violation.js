const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    offenseLevel: {
        type: String,
        enum: ['Level 1', 'Level 2', 'Level 3'],
        required: true,
    },
    offense: {
        type: String,
        required: true,
    },
    points: {
        type: Number,
        required: true,
        min: 0,
    },
    dateOfOffense: {
        type: Date,
        required: true,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['Active', 'Resolved'],
        default: 'Active',
    },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    notes: {
        type: String,
        default: '',
    },
}, { timestamps: true });

module.exports = mongoose.models.Violation || mongoose.model('Violation', violationSchema);
