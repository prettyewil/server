const SystemSettings = require('../models/SystemSettings');

const validatePassword = async (password) => {
    let settings = await SystemSettings.findOne();
    if (!settings) return null; // If no settings, default to allowing everything, or fail safe.

    const { passwordMinLength, requireUppercase, requireNumber, requireSpecialChar } = settings;

    if (passwordMinLength && password.length < passwordMinLength) {
        return `Password must be at least ${passwordMinLength} characters long.`;
    }

    if (requireUppercase && !/[A-Z]/.test(password)) {
        return 'Password must contain at least one uppercase letter.';
    }

    if (requireNumber && !/\d/.test(password)) {
        return 'Password must contain at least one number.';
    }

    if (requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return 'Password must contain at least one special character.';
    }

    return null; // Valid
};

module.exports = { validatePassword };
