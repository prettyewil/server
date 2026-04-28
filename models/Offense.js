const mongoose = require('mongoose');

const offenseSchema = new mongoose.Schema({
    level: {
        type: String,
        enum: ['Level 1', 'Level 2', 'Level 3'],
        required: true,
    },
    offense: {
        type: String,
        required: true,
        unique: true,
    },
    points: {
        type: Number,
        required: true,
        min: 0,
    }
}, { timestamps: true });

module.exports = mongoose.model('Offense', offenseSchema);
