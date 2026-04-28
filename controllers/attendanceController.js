const Attendance = require('../models/Attendance');
const { logAction } = require('../utils/logger');
const User = require('../models/User');
const Pass = require('../models/Pass');

// @desc    Get all attendance logs
// @route   GET /api/attendance
// @access  Public/Admin
const getAttendance = async (req, res) => {
    try {
        const { date, session } = req.query;
        let query = {};

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            query.date = { $gte: startOfDay, $lte: endOfDay };
        }

        if (session) {
            query.session = session;
        } else {
            // Default to morning if no session is provided, or we can just fetch all?
            // Let's keep it flexible: if no session, fetch all (useful for some generic views)
        }

        let logs = await Attendance.find(query).sort({ date: -1 }).populate('student', 'name email studentProfile');

        // Dynamically append students on pass for final attendance
        if (session === 'final' && date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const passes = await Pass.find({
                status: 'approved',
                startDate: { $lte: endOfDay },
                endDate: { $gte: startOfDay }
            }).populate('student', 'name email studentProfile');

            const existingStudentIds = logs.map(log => log.student?._id?.toString() || log.student?.toString());

            const passLogs = passes
                .filter(pass => pass.student && !existingStudentIds.includes(pass.student._id.toString()))
                .map(pass => ({
                    _id: `pass_${pass._id}`,
                    student: pass.student,
                    date: date,
                    session: 'final',
                    status: 'on_pass',
                    timeIn: pass.startDate, // Give them a timeIn representing their pass start
                }));

            logs = [...logs, ...passLogs];
        }

        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create attendance log
// @route   POST /api/attendance
// @access  Admin
const createAttendance = async (req, res) => {
    try {
        if (req.body.session === 'final') {
            const currentHour = new Date().getHours();
            if (currentHour < 20) {
                return res.status(400).json({ message: 'Present attendance can only be recorded after 8:00 PM.' });
            }
        }

        const attendance = await Attendance.create(req.body);
        
        // Lookup student email for better log details
        const student = await User.findById(req.body.student);
        const studentDetail = student ? ` for ${student.email}` : '';
        await logAction(req.user.id, 'CREATE_ATTENDANCE', `Recorded attendance'${studentDetail}' for ${req.body.session || 'morning'} session`, req);

        res.status(201).json(attendance);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update attendance
// @route   PUT /api/attendance/:id
// @access  Admin
const updateAttendance = async (req, res) => {
    try {
        if (req.body.session === 'final') {
            // Usually update is check-out, but final doesn't have check-out. 
            // In case it's a manual edit:
            const currentHour = new Date().getHours();
            if (currentHour < 20) {
                 return res.status(400).json({ message: 'Present attendance can only be modified after 8:00 PM.' });
            }
        }

        const updatedAttendance = await Attendance.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (updatedAttendance) {
            const student = await User.findById(updatedAttendance.student);
            const studentDetail = student ? ` for ${student.email}` : '';
            await logAction(req.user.id, 'UPDATE_ATTENDANCE', `Updated attendance record '${studentDetail}' for ${updatedAttendance.session} session`, req);
        }

        res.json(updatedAttendance);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    getAttendance,
    createAttendance,
    updateAttendance
};
