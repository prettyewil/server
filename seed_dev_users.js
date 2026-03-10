require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const users = [
    {
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@buksu.edu.ph',
        password: 'ValidPass@123',
        role: 'super_admin',
        status: 'active'
    },
    {
        firstName: 'System',
        lastName: 'Manager',
        email: 'manager@buksu.edu.ph',
        password: 'Manager@2025',
        role: 'manager',
        status: 'active'
    },
    {
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@buksu.edu.ph',
        password: 'Admin@123',
        role: 'admin',
        status: 'active'
    },
    {
        firstName: 'Dorm',
        lastName: 'Staff',
        email: 'staff@buksu.edu.ph',
        password: 'Staff@2025',
        role: 'staff',
        status: 'active'
    },
    {
        firstName: 'Dorm',
        lastName: 'Staff2',
        email: 'dormstaff@buksu.edu.ph',
        password: 'Staff@2025',
        role: 'staff',
        status: 'active'
    },
    {
        firstName: 'Alice',
        lastName: 'Student',
        email: 'alice@buksu.edu.ph',
        password: 'Student@2025',
        role: 'student',
        status: 'active',
        studentId: 'STU-1001'
    }
];

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected...');

        for (let u of users) {
            const existingUser = await User.findOne({ email: u.email });
            if (existingUser) {
                console.log(`User ${u.email} already exists. Skipping.`);
                continue;
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(u.password, salt);

            const user = new User({
                ...u,
                password: hashedPassword
            });
            await user.save();
            console.log(`Created user: ${u.email}`);
        }

        console.log('Seeding completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
};

seedUsers();
