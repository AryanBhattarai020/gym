const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Class name is required'],
        trim: true,
        maxlength: [100, 'Class name cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Class description is required'],
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    category: {
        type: String,
        required: [true, 'Class category is required'],
        enum: [
            'cardio',
            'strength',
            'flexibility',
            'dance',
            'martial_arts',
            'water_fitness',
            'mind_body',
            'functional_training',
            'sports_specific',
            'rehabilitation'
        ]
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trainer',
        required: [true, 'Instructor is required']
    },
    duration: {
        type: Number,
        required: [true, 'Class duration is required'],
        min: [15, 'Duration must be at least 15 minutes'],
        max: [180, 'Duration cannot exceed 180 minutes']
    },
    maxParticipants: {
        type: Number,
        required: [true, 'Maximum participants is required'],
        min: [1, 'Must allow at least 1 participant'],
        max: [50, 'Cannot exceed 50 participants']
    },
    difficulty: {
        type: String,
        required: [true, 'Difficulty level is required'],
        enum: ['beginner', 'intermediate', 'advanced', 'all_levels']
    },
    equipment: [{
        name: String,
        required: Boolean,
        description: String
    }],
    prerequisites: [String],
    benefits: [String],
    schedule: [{
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
        },
        room: {
            type: String,
            required: [true, 'Room is required']
        }
    }],
    price: {
        dropIn: {
            type: Number,
            default: 0,
            min: 0
        },
        memberDiscount: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
    },
    membershipRequirement: {
        type: String,
        enum: ['none', 'basic', 'premium', 'elite'],
        default: 'none'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    image: {
        type: String,
        default: null
    },
    tags: [String],
    averageRating: {
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
}, {
    timestamps: true
});

// Index for better query performance
classSchema.index({ isActive: 1, category: 1 });
classSchema.index({ instructor: 1, isActive: 1 });
classSchema.index({ 'schedule.day': 1, 'schedule.startTime': 1 });
classSchema.index({ difficulty: 1, isActive: 1 });
classSchema.index({ membershipRequirement: 1 });

// Virtual for checking if class is currently running
classSchema.virtual('isRunning').get(function() {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    return this.schedule.some(session => {
        return session.day === currentDay && 
               session.startTime <= currentTime && 
               session.endTime >= currentTime;
    });
});

// Method to get next class session
classSchema.methods.getNextSession = function() {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.toTimeString().slice(0, 5);
    
    const dayMap = {
        0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
        4: 'thursday', 5: 'friday', 6: 'saturday'
    };
    
    // Find next session this week
    for (let i = 0; i < 7; i++) {
        const checkDay = (currentDay + i) % 7;
        const dayName = dayMap[checkDay];
        
        const sessions = this.schedule.filter(session => session.day === dayName);
        
        for (const session of sessions) {
            if (i === 0 && session.startTime <= currentTime) continue; // Skip past sessions today
            
            const nextDate = new Date(now);
            nextDate.setDate(now.getDate() + i);
            
            return {
                ...session.toObject(),
                date: nextDate.toISOString().split('T')[0],
                dayName: dayName
            };
        }
    }
    
    return null;
};

// Ensure virtual fields are serialized
classSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Class', classSchema);