const normalizeRole = (role) =>
    role == null || role === '' ? '' : String(role).toLowerCase().replace(/\s+/g, '_');

const restrictTo = (...roles) => {
    const allowed = roles.map(normalizeRole);
    return (req, res, next) => {
        const userRole = normalizeRole(req.user?.role);
        if (!req.user || !allowed.includes(userRole)) {
            return res.status(403).json({ message: 'User role is not authorized to access this route' });
        }
        next();
    };
};

module.exports = { restrictTo };
