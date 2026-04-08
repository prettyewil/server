const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
    backupFrequency: {
        type: String,
        default: 'weekly',
    },
    sessionTimeout: {
        type: Number, // in minutes
        default: 15,
    },
    maintenanceMode: {
        type: Boolean,
        default: false,
    },
    allowRegistration: {
        type: Boolean,
        default: true,
    },
    passwordMinLength: { type: Number, default: 8 },
    requireUppercase: { type: Boolean, default: true },
    requireNumber: { type: Boolean, default: true },
    requireSpecialChar: { type: Boolean, default: true },
    enableGoogleCalendar: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
