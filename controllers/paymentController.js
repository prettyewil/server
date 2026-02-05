const Payment = require('../models/Payment');
const User = require('../models/User');
const { logAction } = require('../utils/logger');

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private (Admin)
const getPayments = async (req, res) => {
    try {
        const payments = await Payment.find().populate('student', 'name email roomNumber');
        res.status(200).json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get my payment history
// @route   GET /api/payments/my-history
// @access  Private (Student)
const getMyHistory = async (req, res) => {
    try {
        const payments = await Payment.find({ student: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new payment
// @route   POST /api/payments
// @access  Private (Admin)
const createPayment = async (req, res) => {
    const { student, amount, type, dueDate, notes } = req.body;

    try {
        // Check if student exists
        const studentUser = await User.findById(student);
        if (!studentUser || studentUser.role !== 'student') {
            return res.status(404).json({ message: 'Student not found' });
        }

        const payment = await Payment.create({
            student,
            amount,
            type,
            dueDate,
            notes,
            status: 'pending' // Default
        });

        res.status(201).json(payment);

        // Log payment creation
        // Note: req.user might be undefined if this is an admin action on behalf of someone else, 
        // need to check if we have req.user from middleware
        const actorId = req.user ? req.user.id : student;
        await logAction(actorId, 'CREATE_PAYMENT', `Created payment of ${amount} for student ${studentUser.email}`, req);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update payment status
// @route   PATCH /api/payments/:id
// @access  Private (Admin)
const updatePaymentStatus = async (req, res) => {
    const { status } = req.body;

    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        payment.status = status;
        if (status === 'paid') {
            payment.paidDate = Date.now();
        } else {
            payment.paidDate = undefined;
        }

        const updatedPayment = await payment.save();
        res.status(200).json(updatedPayment);

        // Log status update
        await logAction(req.user.id, 'UPDATE_PAYMENT', `Updated payment ${payment._id} status to ${status}`, req);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getPayments,
    getMyHistory,
    createPayment,
    updatePaymentStatus,
};
