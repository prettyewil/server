const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

app.use(express.json());
app.use(cors({
    origin: '*',
    credentials: true,
}));
app.use(helmet({
    crossOriginResourcePolicy: false,
}));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/notifications', require('./routes/notificationRoutes'));

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const roomRoutes = require('./routes/roomRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const taskRoutes = require('./routes/taskRoutes');
const studentRoutes = require('./routes/studentRoutes');
const userRoutes = require('./routes/userRoutes');
const logRoutes = require('./routes/logRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const passRoutes = require('./routes/passRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const violationRoutes = require('./routes/violationRoutes');
const offenseRoutes = require('./routes/offenseRoutes');

const { errorHandler } = require('./middleware/errorMiddleware');

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/pass-management', passRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/violations', violationRoutes);
app.use('/api/offenses', offenseRoutes);


app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'DormSync API is running' });
});

app.get('/api/db-check', async (req, res) => {
    try {
        const { connectDB } = require('./db');
        const db = await connectDB();
        res.json({ status: 'OK', readyState: db.readyState });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', message: err.message });
    }
});

app.get('/', (req, res) => {
    res.send('DormSync API is running');
});

app.use(errorHandler);

module.exports = app;
