require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

function redactUri(uri) {
    if (!uri || typeof uri !== 'string') return '(missing)';
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

const connectDB = async () => {
    try {
        console.log('Connecting to MongoDB:', redactUri(process.env.MONGO_URI));
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 45_000,
            family: 4,
        });
        console.log('MongoDB connected...');
    } catch (err) {
        console.error('MongoDB connection error:', err.stack || err);
        process.exit(1);
    }
};

/**
 * Seed users. Staff + student use skipEmailOtp (no email 2FA on login; reset OTP use 000000).
 */
const seedUsers = async () => {
    await connectDB();

    const users = [
        {
            firstName: 'Super',
            lastName: 'Admin',
            email: 'superadmin@buksu.edu.ph',
            password: 'ValidPass@123',
            role: 'super_admin',
            status: 'approved',
            skipEmailOtp: true,
        },
        {
            firstName: 'Manager',
            lastName: 'User',
            email: 'manager@buksu.edu.ph',
            password: 'Manager@2025',
            role: 'manager',
            status: 'approved',
            skipEmailOtp: true,
        },
        {
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@buksu.edu.ph',
            password: 'Admin@123',
            role: 'admin',
            status: 'approved',
            skipEmailOtp: true,
        },
        {
            firstName: 'Staff',
            lastName: 'Seeder',
            email: 'stafftest@buksu.edu.ph',
            password: 'Staff@2025',
            role: 'staff',
            status: 'approved',
            skipEmailOtp: true,
        },
        {
            firstName: 'Student',
            lastName: 'Seeder',
            email: 'studenttest@student.buksu.edu.ph',
            password: 'Student@2025',
            role: 'student',
            status: 'approved',
            skipEmailOtp: true,
            studentId: '9900112233',
            studentProfile: {
                status: 'active',
            },
        },
    ];

    for (const u of users) {
        const exists = await User.findOne({ email: u.email });
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(u.password, salt);

        const doc = {
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            password: hashed,
            role: u.role,
            status: u.status,
            skipEmailOtp: !!u.skipEmailOtp,
        };
        if (u.studentId) doc.studentId = u.studentId;
        if (u.studentProfile) doc.studentProfile = u.studentProfile;

        if (exists) {
            const $set = {
                firstName: u.firstName,
                lastName: u.lastName,
                password: hashed,
                role: u.role,
                status: u.status,
                skipEmailOtp: !!u.skipEmailOtp,
            };
            if (u.studentId) $set.studentId = u.studentId;
            if (u.studentProfile) $set.studentProfile = u.studentProfile;
            await User.updateOne({ _id: exists._id }, { $set });
            console.log(`Upserted seed user: ${u.email}`);
            continue;
        }

        await User.create(doc);
        console.log(`Created ${u.role} account: ${u.email}`);
    }

    await mongoose.disconnect();
    console.log('Seeding completed.');
};

seedUsers();
