const mongoose = require('mongoose');

const userMembershipSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required']
    },
    membership: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Membership',
        required: [true, 'Membership plan is required']
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required'],
        default: Date.now
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required']
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'cancelled', 'suspended'],
        default: 'active'
    },
    billingCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        required: [true, 'Billing cycle is required'],
        default: 'monthly'
    },
    autoRenew: {
        type: Boolean,
        default: true
    },
    paymentInfo: {
        amount: {
            type: Number,
            required: [true, 'Payment amount is required'],
            min: [0, 'Amount cannot be negative']
        },
        currency: {
            type: String,
            default: 'USD'
        },
        paymentMethod: {
            type: String,
            enum: ['card', 'bank_transfer', 'cash', 'check'],
            required: [true, 'Payment method is required']
        },
        transactionId: String,
        paymentDate: {
            type: Date,
            default: Date.now
        }
    },
    usage: {
        gymVisits: {
            type: Number,
            default: 0
        },
        classesAttended: {
            type: Number,
            default: 0
        },
        personalTrainingSessions: {
            type: Number,
            default: 0
        },
        guestPassesUsed: {
            type: Number,
            default: 0
        }
    },
    notes: String,
    cancelledAt: Date,
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cancellationReason: String
}, {
    timestamps: true
});

// Index for better query performance
userMembershipSchema.index({ user: 1, status: 1 });
userMembershipSchema.index({ endDate: 1, status: 1 });
userMembershipSchema.index({ status: 1, autoRenew: 1 });

// Virtual for checking if membership is expired
userMembershipSchema.virtual('isExpired').get(function() {
    return this.endDate < new Date() && this.status === 'active';
});

// Virtual for days remaining
userMembershipSchema.virtual('daysRemaining').get(function() {
    if (this.status !== 'active') return 0;
    
    const now = new Date();
    const end = new Date(this.endDate);
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
});

// Method to check if membership needs renewal
userMembershipSchema.methods.needsRenewal = function() {
    return this.daysRemaining <= 7 && this.autoRenew && this.status === 'active';
};

// Ensure virtual fields are serialized
userMembershipSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('UserMembership', userMembershipSchema);