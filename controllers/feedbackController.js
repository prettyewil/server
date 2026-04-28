const Feedback = require('../models/Feedback');

// @desc    Create a new feedback
// @route   POST /api/feedback
// @access  Private
const createFeedback = async (req, res) => {
    try {
        const { rating, comment, context } = req.body;

        const feedback = await Feedback.create({
            user: req.user.id,
            rating,
            comment,
            context
        });

        res.status(201).json(feedback);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get public feedbacks (high rating with comments)
// @route   GET /api/feedback/public
// @access  Public
const getPublicFeedback = async (req, res) => {
    try {
        // Fetch feedbacks that have a rating >= 4 and contain a comment
        const feedbacks = await Feedback.find({
            rating: { $gte: 4 },
            comment: { $exists: true, $ne: '' }
        })
        .populate('user', 'name firstName')
        .sort({ createdAt: -1 })
        .limit(10); // Limit to top 10 recent feedbacks

        res.json(feedbacks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createFeedback,
    getPublicFeedback
};
