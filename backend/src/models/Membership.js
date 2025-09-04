const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
    planName: {
        type: String,
        required: [true, 'Plan name is required'],
        enum: ['Basic', 'Premium', 'Elite'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Plan description is required']
    },
    price: {
        monthly: {
            type: Number,
            required: [true, 'Monthly price is required'],
            min: [0, 'Price cannot be negative']
        },
        yearly: {
            type: Number,
            required: [true, 'Yearly price is required'],
            min: [0, 'Price cannot be negative']
        }
    },
    features: [{
        name: {
            type: String,
            required: true
        },
        included: {
            type: Boolean,
            required: true
        },
        description: String
    }],
    limits: {
        gymAccess: {
            type: String,
            enum: ['staffed_hours', '24_7', 'restricted'],
            default: 'staffed_hours'
        },
        guestPasses: {
            type: Number,
            default: 0,
            min: 0
        },
        personalTrainingSessions: {
            type: Number,
            default: 0,
            min: 0
        },
        groupClasses: {
            type: String,
            enum: ['none', 'limited', 'unlimited'],
            default: 'none'
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isPopular: {
        type: Boolean,
        default: false
    },
    sortOrder: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for better query performance
membershipSchema.index({ isActive: 1, sortOrder: 1 });
membershipSchema.index({ planName: 1 });

module.exports = mongoose.model('Membership', membershipSchema);