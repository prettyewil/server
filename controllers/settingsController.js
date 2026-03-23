const SystemSettings = require('../models/SystemSettings');

// @desc    Get system settings
// @route   GET /api/settings
// @access  Private (Admin/Manager)
const getSettings = async (req, res) => {
    try {
        let settings = await SystemSettings.findOne();
        if (!settings) {
            settings = await SystemSettings.create({});
        }
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update system settings
// @route   PUT /api/settings
// @access  Private (Super Admin)
const updateSettings = async (req, res) => {
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Not authorized as a Super Admin' });
    }

    try {
        let settings = await SystemSettings.findOne();
        if (!settings) {
            settings = new SystemSettings(req.body);
            await settings.save();
            return res.status(200).json(settings);
        }

        const updatedSettings = await SystemSettings.findByIdAndUpdate(
            settings._id,
            req.body,
            { new: true }
        );

        res.status(200).json(updatedSettings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getSettings,
    updateSettings,
};
