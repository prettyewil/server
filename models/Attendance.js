const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    session: {
        type: String,
        enum: ['morning', 'afternoon', 'evening', 'final'],
        default: 'morning',
    },
    timeIn: {
        type: Date,
    },
    timeOut: {
        type: Date,
    },
    status: {
        type: String,
        enum: ['present', 'late', 'absent', 'on_pass'],
        default: 'present',
    },
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
