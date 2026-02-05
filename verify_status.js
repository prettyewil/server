const mongoose = require('mongoose');
const User = require('./models/User'); // Adjusted path for running inside server/

require('dotenv').config(); // Adjusted for running inside server/

async function runVerification() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Create a test student directly via model to check default
        console.log('\n--- Test 1: Default Status ---');
        const testEmail = `test_verif_${Date.now()}@example.com`;
        const newStudent = new User({
            name: 'Test Student',
            email: testEmail,
            password: 'password',
            role: 'student',
            studentProfile: { roomNumber: '101' }
        });
        await newStudent.save();

        console.log('Created Student Status:', newStudent.status); // Should be 'pending'
        console.log('Created Profile Status:', newStudent.studentProfile.status); // Should be 'inactive'

        if (newStudent.status === 'pending' && newStudent.studentProfile.status === 'inactive') {
            console.log('✅ Default status check PASSED');
        } else {
            console.error('❌ Default status check FAILED');
        }

        // 2. Test Controller Update Logic (Sync)
        console.log('\n--- Test 2: Admin Approval Sync ---');

        let user = await User.findById(newStudent._id);

        // SIMULATE CONTROLLER LOGIC
        console.log('Simulating Controller Action: Change to Active');
        user.studentProfile.status = 'active';
        if (user.studentProfile.status === 'active') {
            user.status = 'approved';
        } else if (user.studentProfile.status === 'inactive') {
            user.status = 'pending';
        }
        await user.save();

        user = await User.findById(newStudent._id);
        console.log('Updated Status:', user.status);
        console.log('Updated Profile Status:', user.studentProfile.status);

        if (user.status === 'approved' && user.studentProfile.status === 'active') {
            console.log('✅ Activation Sync PASSED');
        } else {
            console.log('❌ Activation Sync FAILED');
        }

        // SIMULATE CONTROLLER LOGIC DOWNGRADE
        console.log('\n--- Test 3: Admin Deactivation Sync ---');
        user.studentProfile.status = 'inactive';
        if (user.studentProfile.status === 'active') {
            user.status = 'approved';
        } else if (user.studentProfile.status === 'inactive') {
            user.status = 'pending';
        }
        await user.save();

        user = await User.findById(newStudent._id);
        console.log('Updated Status:', user.status);
        console.log('Updated Profile Status:', user.studentProfile.status);

        if (user.status === 'pending' && user.studentProfile.status === 'inactive') {
            console.log('✅ Deactivation Sync PASSED');
        } else {
            console.log('❌ Deactivation Sync FAILED');
        }

        // Cleanup
        await User.findByIdAndDelete(newStudent._id);
        console.log('\nTest User Cleaned up.');

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        await mongoose.connection.close();
    }
}

runVerification();
