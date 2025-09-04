const mongoose = require('mongoose');

const trainerSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User reference is required']
    },
    specializations: [{
        type: String,
        required: true,
        enum: [
            'strength_training',
            'cardio',
            'yoga',
            'pilates',
            'hiit',
            'bodybuilding',
            'powerlifting',
            'crossfit',
            'martial_arts',
            'dance',
            'swimming',
            'nutrition',
            'rehabilitation',
            'senior_fitness',
            'youth_fitness'
        ]
    }],
    certifications: [{
        name: {
            type: String,
            required: [true, 'Certification name is required']
        },
        issuingOrganization: {
            type: String,
            required: [true, 'Issuing organization is required']
        },
        issueDate: {
            type: Date,
            required: [true, 'Issue date is required']
        },
        expiryDate: {
            type: Date,
            required: [true, 'Expiry date is required']
        },
        certificateNumber: String
    }],
    experience: {
        yearsOfExperience: {
            type: Number,
            required: [true, 'Years of experience is required'],
            min: [0, 'Experience cannot be negative']
        },
        previousGyms: [{
            name: String,
            position: String,
            startDate: Date,
            endDate: Date,
            description: String
        }],
        achievements: [String]
    },
    bio: {
        type: String,
        required: [true, 'Bio is required'],
        maxlength: [1000, 'Bio cannot exceed 1000 characters']
    },
    availability: [{
        day: {
            type: String,
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
            required: true
        },
        startTime: {
            type: String,
            required: true,
            match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
        },
        endTime: {
            type: String,
            required: true,
            match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
        }
    }],
    hourlyRate: {
        type: Number,
        required: [true, 'Hourly rate is required'],
        min: [0, 'Hourly rate cannot be negative']
    },
    socialMedia: {
        instagram: String,
        facebook: String,
        twitter: String,
        linkedin: String,
        youtube: String,
        website: String
    },
    rating: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        totalReviews: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    hireDate: {
        type: Date,
        default: Date.now
    },
    maxClientsPerDay: {
        type: Number,
        default: 8,
        min: 1
    },
    sessionDuration: {
        type: Number,
        default: 60, // minutes
        min: 30,
        max: 120
    }
}, {
    timestamps: true
});

// Index for better query performance
trainerSchema.index({ isActive: 1, 'rating.average': -1 });
trainerSchema.index({ specializations: 1, isActive: 1 });
trainerSchema.index({ 'availability.day': 1 });

// Virtual for checking if certifications are up to date
trainerSchema.virtual('hasValidCertifications').get(function() {
    const now = new Date();
    return this.certifications.every(cert => new Date(cert.expiryDate) > now);
});

// Method to check availability for a specific day and time
trainerSchema.methods.isAvailable = function(day, time) {
    const availability = this.availability.find(avail => avail.day === day.toLowerCase());
    if (!availability) return false;
    
    const [hours, minutes] = time.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    
    const [startHours, startMinutes] = availability.startTime.split(':').map(Number);
    const startTimeInMinutes = startHours * 60 + startMinutes;
    
    const [endHours, endMinutes] = availability.endTime.split(':').map(Number);
    const endTimeInMinutes = endHours * 60 + endMinutes;
    
    return timeInMinutes >= startTimeInMinutes && timeInMinutes <= endTimeInMinutes;
};

// Ensure virtual fields are serialized
trainerSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Trainer', trainerSchema);