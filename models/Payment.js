const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        enum: ['rent', 'utilities', 'other'],
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'overdue', 'verified', 'submitted'],
        default: 'pending',
    },
    dueDate: {
        type: Date,
        required: true,
    },
    paidDate: {
        type: Date,
    },
    notes: {
        type: String,
    },
    receiptUrl: {
        type: String,
    },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
