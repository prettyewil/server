const { backupDatabase } = require('./services/backupService');
const mongoose = require('mongoose');
require('dotenv').config();

const runTest = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        await backupDatabase();
        console.log('Backup Test Complete');
        process.exit(0);
    } catch (error) {
        console.error('Test Failed', error);
        process.exit(1);
    }
};

runTest();
