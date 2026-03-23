const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const uri = process.env.MONGO_URI;

mongoose.connect(uri)
    .then(async () => {
        try {
            const latestUsers = await User.find({}, 'email role createdAt').sort({ createdAt: -1 }).limit(5);
            console.log("--- LATEST USERS ---");
            console.log(JSON.stringify(latestUsers, null, 2));
        } catch (err) {
            console.error(err);
        } finally {
            mongoose.disconnect();
        }
    })
    .catch(err => {
        console.error('Connection error', err);
        process.exit(1);
    });
