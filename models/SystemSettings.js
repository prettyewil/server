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
    }
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
