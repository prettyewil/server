require('dotenv').config();
const mongoose = require('mongoose');

async function migrateRoles() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to DB');

        // First, check if there are any old 'admin' users that need to be managers.
        // We might want to rename old admin to manager if they exist, or just leave them if none.
        // The prompt previously said: "remove entirely the admin role remain the super admin, manager, staff, and student the super admin rename it into admin"
        
        const oldAdmins = await mongoose.connection.collection('users').updateMany(
            { role: 'admin' },
            { $set: { role: 'manager' } }
        );
        console.log(`Updated ${oldAdmins.modifiedCount} old 'admin' users to 'manager'`);

        const superAdmins = await mongoose.connection.collection('users').updateMany(
            { role: 'super_admin' },
            { $set: { role: 'admin' } }
        );
        console.log(`Updated ${superAdmins.modifiedCount} 'super_admin' users to 'admin'`);

        console.log('Migration complete');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

migrateRoles();
