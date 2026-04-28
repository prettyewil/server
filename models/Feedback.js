const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    comment: {
        type: String,
        trim: true,
    },
    context: {
        type: String,
        enum: ['login', 'logout'],
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);
