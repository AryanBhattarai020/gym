const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        trim: true,
        maxlength: [20, 'Phone number cannot exceed 20 characters']
    },
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        enum: [
            'membership',
            'personal-training',
            'group-classes',
            'facilities',
            'corporate',
            'complaint',
            'suggestion',
            'billing',
            'technical',
            'other'
        ]
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        maxlength: [2000, 'Message cannot exceed 2000 characters']
    },
    status: {
        type: String,
        enum: ['new', 'in_progress', 'resolved', 'closed'],
        default: 'new'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    response: {
        message: String,
        respondedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        respondedAt: Date
    },
    followUp: {
        required: {
            type: Boolean,
            default: false
        },
        date: Date,
        notes: String
    },
    source: {
        type: String,
        enum: ['website', 'email', 'phone', 'in_person', 'social_media'],
        default: 'website'
    },
    tags: [String],
    internalNotes: [{
        note: String,
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    customerSatisfaction: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        feedback: String,
        submittedAt: Date
    },
    resolvedAt: Date,
    resolutionTime: Number, // in hours
    ipAddress: String,
    userAgent: String
}, {
    timestamps: true
});

// Index for better query performance
contactSchema.index({ status: 1, priority: 1 });
contactSchema.index({ assignedTo: 1, status: 1 });
contactSchema.index({ subject: 1, status: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ email: 1 });

// Pre-save middleware to calculate resolution time
contactSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === 'resolved' && !this.resolvedAt) {
        this.resolvedAt = new Date();
        const resolutionTimeMs = this.resolvedAt - this.createdAt;
        this.resolutionTime = Math.round(resolutionTimeMs / (1000 * 60 * 60)); // Convert to hours
    }
    next();
});

// Virtual for checking if contact is overdue (no response in 24 hours for high priority, 48 hours for others)
contactSchema.virtual('isOverdue').get(function() {
    if (this.status === 'resolved' || this.status === 'closed') return false;
    
    const now = new Date();
    const hoursThreshold = this.priority === 'high' || this.priority === 'urgent' ? 24 : 48;
    const hoursSinceCreated = (now - this.createdAt) / (1000 * 60 * 60);
    
    return hoursSinceCreated > hoursThreshold;
});

// Virtual for age in hours
contactSchema.virtual('ageInHours').get(function() {
    const now = new Date();
    return Math.round((now - this.createdAt) / (1000 * 60 * 60));
});

// Method to add internal note
contactSchema.methods.addInternalNote = function(note, userId) {
    this.internalNotes.push({
        note: note,
        addedBy: userId,
        addedAt: new Date()
    });
    return this.save();
};

// Method to assign to staff member
contactSchema.methods.assignTo = function(userId) {
    this.assignedTo = userId;
    this.status = 'in_progress';
    return this.save();
};

// Static method to get overdue contacts
contactSchema.statics.getOverdue = function() {
    const now = new Date();
    const highPriorityThreshold = new Date(now - 24 * 60 * 60 * 1000); // 24 hours ago
    const normalThreshold = new Date(now - 48 * 60 * 60 * 1000); // 48 hours ago
    
    return this.find({
        status: { $in: ['new', 'in_progress'] },
        $or: [
            {
                priority: { $in: ['high', 'urgent'] },
                createdAt: { $lt: highPriorityThreshold }
            },
            {
                priority: { $in: ['low', 'medium'] },
                createdAt: { $lt: normalThreshold }
            }
        ]
    }).populate('assignedTo', 'firstName lastName email');
};

// Ensure virtual fields are serialized
contactSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Contact', contactSchema);