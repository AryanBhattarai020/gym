const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    dateOfBirth: {
        type: Date,
        required: [true, 'Date of birth is required']
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: [true, 'Gender is required']
    },
    emergencyContact: {
        name: {
            type: String,
            required: [true, 'Emergency contact name is required']
        },
        phone: {
            type: String,
            required: [true, 'Emergency contact phone is required']
        },
        relationship: {
            type: String,
            required: [true, 'Emergency contact relationship is required']
        }
    },
    membership: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Membership'
    },
    membershipStatus: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'cancelled'],
        default: 'inactive'
    },
    role: {
        type: String,
        enum: ['member', 'trainer', 'admin'],
        default: 'member'
    },
    profileImage: {
        type: String,
        default: null
    },
    preferences: {
        notifications: {
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: false },
            push: { type: Boolean, default: true }
        },
        preferredContactMethod: {
            type: String,
            enum: ['email', 'phone', 'text'],
            default: 'email'
        }
    },
    fitnessGoals: [{
        type: String,
        enum: ['weight_loss', 'muscle_gain', 'endurance', 'strength', 'flexibility', 'general_fitness']
    }],
    medicalConditions: [{
        condition: String,
        description: String
    }],
    joinDate: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ membershipStatus: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Get age
userSchema.virtual('age').get(function() {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);