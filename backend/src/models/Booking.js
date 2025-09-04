const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required']
    },
    type: {
        type: String,
        enum: ['class', 'personal_training', 'facility'],
        required: [true, 'Booking type is required']
    },
    // For class bookings
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
    },
    // For personal training bookings
    trainer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trainer'
    },
    // For facility bookings (courts, pools, etc.)
    facility: {
        name: String,
        type: {
            type: String,
            enum: ['tennis_court', 'basketball_court', 'swimming_pool', 'sauna', 'meeting_room']
        }
    },
    date: {
        type: Date,
        required: [true, 'Booking date is required']
    },
    startTime: {
        type: String,
        required: [true, 'Start time is required'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    },
    endTime: {
        type: String,
        required: [true, 'End time is required'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    },
    duration: {
        type: Number,
        required: [true, 'Duration is required'],
        min: [15, 'Duration must be at least 15 minutes']
    },
    status: {
        type: String,
        enum: ['confirmed', 'pending', 'cancelled', 'completed', 'no_show'],
        default: 'confirmed'
    },
    participants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['confirmed', 'waitlist', 'cancelled'],
            default: 'confirmed'
        }
    }],
    notes: {
        user: String,
        trainer: String,
        admin: String
    },
    payment: {
        amount: {
            type: Number,
            default: 0,
            min: 0
        },
        status: {
            type: String,
            enum: ['pending', 'paid', 'refunded', 'failed'],
            default: 'pending'
        },
        method: {
            type: String,
            enum: ['membership', 'card', 'cash', 'bank_transfer']
        },
        transactionId: String
    },
    cancellation: {
        cancelledAt: Date,
        cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: String,
        refundAmount: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    reminders: {
        sent24h: { type: Boolean, default: false },
        sent2h: { type: Boolean, default: false },
        sent30min: { type: Boolean, default: false }
    },
    feedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: String,
        submittedAt: Date
    }
}, {
    timestamps: true
});

// Index for better query performance
bookingSchema.index({ user: 1, date: 1 });
bookingSchema.index({ trainer: 1, date: 1, startTime: 1 });
bookingSchema.index({ class: 1, date: 1 });
bookingSchema.index({ status: 1, date: 1 });
bookingSchema.index({ date: 1, startTime: 1 });

// Virtual for checking if booking is in the past
bookingSchema.virtual('isPast').get(function() {
    const now = new Date();
    const bookingDateTime = new Date(this.date);
    const [hours, minutes] = this.endTime.split(':').map(Number);
    bookingDateTime.setHours(hours, minutes);
    
    return bookingDateTime < now;
});

// Virtual for checking if booking is today
bookingSchema.virtual('isToday').get(function() {
    const today = new Date();
    const bookingDate = new Date(this.date);
    
    return today.toDateString() === bookingDate.toDateString();
});

// Virtual for checking if booking is upcoming (within 24 hours)
bookingSchema.virtual('isUpcoming').get(function() {
    const now = new Date();
    const bookingDateTime = new Date(this.date);
    const [hours, minutes] = this.startTime.split(':').map(Number);
    bookingDateTime.setHours(hours, minutes);
    
    const hoursDiff = (bookingDateTime - now) / (1000 * 60 * 60);
    return hoursDiff > 0 && hoursDiff <= 24;
});

// Method to check if booking can be cancelled
bookingSchema.methods.canBeCancelled = function() {
    if (this.status === 'cancelled' || this.status === 'completed') {
        return { canCancel: false, reason: 'Booking is already cancelled or completed' };
    }
    
    const now = new Date();
    const bookingDateTime = new Date(this.date);
    const [hours, minutes] = this.startTime.split(':').map(Number);
    bookingDateTime.setHours(hours, minutes);
    
    const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);
    
    if (hoursUntilBooking < 2) {
        return { canCancel: false, reason: 'Cannot cancel within 2 hours of booking time' };
    }
    
    return { canCancel: true };
};

// Method to calculate refund amount based on cancellation time
bookingSchema.methods.calculateRefund = function() {
    if (this.payment.amount === 0) return 0;
    
    const now = new Date();
    const bookingDateTime = new Date(this.date);
    const [hours, minutes] = this.startTime.split(':').map(Number);
    bookingDateTime.setHours(hours, minutes);
    
    const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);
    
    if (hoursUntilBooking >= 24) {
        return this.payment.amount; // Full refund
    } else if (hoursUntilBooking >= 4) {
        return this.payment.amount * 0.5; // 50% refund
    } else {
        return 0; // No refund
    }
};

// Ensure virtual fields are serialized
bookingSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Booking', bookingSchema);