const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config({ path: './.env' });

const checkUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Find users with email containing 'cydiemar' or 'lagrosas'
        const users = await User.find({
            $or: [
                { email: /cydiemar/i },
                { email: /lagrosas/i }
            ]
        });

        console.log('Found Users:');
        users.forEach(u => {
            console.log(`ID: ${u._id}`);
            console.log(`Email: ${u.email}`);
            console.log(`Name: ${u.name || u.firstName + ' ' + u.lastName}`);
            console.log(`Role: ${u.role}`);
            console.log('-------------------');
        });

        // Also listing all just in case
        if (users.length === 0) {
            console.log('No specific users found, listing first 5 users:');
            const allRequest = await User.find({}).limit(5);
            allRequest.forEach(u => console.log(`${u.email}: ${u.role}`));
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkUser();
