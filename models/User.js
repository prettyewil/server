const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    middleInitial: {
        type: String,
        maxLength: 2,
        trim: true
    },
    // Keep 'name' for backward compatibility in DB if needed, 
    // but typically we can remove it if we use a virtual.
    // However, to avoid migration scripts for now, let's keep it optional 
    // or rely on the virtual.
    // If we remove 'name' from schema, 'user.name' will fail for old records unless we use lean() or virtuals.
    // Let's keep it but make it not required, or rely on the fact that existing docs have it.
    // Better approach: Add virtual 'fullName' and map 'name' to it if possible, 
    // OR just use these new fields and a virtual for 'name'.
    // NOTE: Mongoose virtuals are not stored in DB.
    // We will keep the old 'name' field in the schema definition BUT make it not required
    // so new users don't need it stored explicitly.
    name: {
        type: String,
        // required: true // No longer required as we derive it
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['super_admin', 'manager', 'admin', 'student', 'staff'],
        default: 'student',
    },
    studentId: {
        type: String,
        unique: true,
        sparse: true // Allows null/undefined for admins
    },
    studentProfile: {
        type: {
            roomNumber: String,
            phoneNumber: String,
            enrollmentDate: Date,
            emergencyContactName: String,
            emergencyContactPhone: String,
            status: {
                type: String,
                enum: ['active', 'inactive', 'graduated'],
                default: 'inactive',
            },
        },
        default: undefined, // Only for students
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'unverified', 'active'],
        default: 'pending'
    },
    otp: {
        type: String,
        select: false // Do not return by default
    },
    otpExpires: {
        type: Date,
        select: false
    }
}, { timestamps: true });

// Pre-save hook to ensure studentProfile exists only for students?
// Virtual for full name
userSchema.virtual('fullName').get(function () {
    if (this.firstName && this.lastName) {
        return `${this.firstName} ${this.middleInitial ? this.middleInitial + '. ' : ''}${this.lastName}`;
    }
    return this.name; // Fallback to old field
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// Pre-save hook to ensure 'name' field is populated for backward compatibility if desired,
// or just rely on the new fields.
// Let's populate the old 'name' field automatically so we don't break simple queries that look for 'name'.
userSchema.pre('save', function () {
    if (this.firstName && this.lastName) {
        this.name = `${this.firstName} ${this.middleInitial ? this.middleInitial + '. ' : ''}${this.lastName}`;
    }
});


module.exports = mongoose.model('User', userSchema);
