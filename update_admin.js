const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config({ path: './.env' });

const updateUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const email = 'lagrosascydiemar@gmail.com';
        const user = await User.findOne({ email: new RegExp(email, 'i') });

        if (user) {
            console.log(`Found user: ${user.email} with role: ${user.role}`);
            user.role = 'super_admin';
            await user.save();
            console.log(`Updated user ${user.email} to super_admin`);
        } else {
            console.log('User not found');
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

updateUser();
