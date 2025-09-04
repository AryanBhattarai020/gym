const express = require('express');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { createResponse, getPaginationInfo, formatDate, formatTime } = require('../utils/helpers');
const { sendEmail } = require('../utils/email');
const Class = require('../models/Class');
const Booking = require('../models/Booking');
const Trainer = require('../models/Trainer');

const router = express.Router();

// @desc    Get all classes
// @route   GET /api/classes
// @access  Public
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        category,
        difficulty,
        instructor,
        day,
        search,
        sortBy = 'name',
        sortOrder = 'asc'
    } = req.query;

    // Build query
    let query = { isActive: true };

    if (category) {
        query.category = category;
    }

    if (difficulty) {
        query.difficulty = difficulty;
    }

    if (instructor) {
        query.instructor = instructor;
    }

    if (day) {
        query['schedule.day'] = day.toLowerCase();
    }

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } }
        ];
    }

    // Get pagination info
    const total = await Class.countDocuments(query);
    const pagination = getPaginationInfo(page, limit, total);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get classes
    const classes = await Class.find(query)
        .populate('instructor', 'user specializations rating')
        .populate({
            path: 'instructor',
            populate: {
                path: 'user',
                select: 'firstName lastName profileImage'
            }
        })
        .sort(sort)
        .skip(pagination.skip)
        .limit(pagination.itemsPerPage);

    res.json(
        createResponse(true, 'Classes retrieved successfully', { classes }, pagination)
    );
}));

// @desc    Get single class
// @route   GET /api/classes/:id
// @access  Public
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
    const classItem = await Class.findOne({ _id: req.params.id, isActive: true })
        .populate('instructor', 'user specializations rating bio hourlyRate')
        .populate({
            path: 'instructor',
            populate: {
                path: 'user',
                select: 'firstName lastName profileImage'
            }
        });

    if (!classItem) {
        return res.status(404).json(
            createResponse(false, 'Class not found')
        );
    }

    // Get upcoming sessions for this class
    const upcomingSessions = [];
    const today = new Date();
    
    for (let i = 0; i < 14; i++) { // Next 14 days
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        const sessions = classItem.schedule.filter(session => session.day === dayName);
        
        for (const session of sessions) {
            // Check if session is in the future (for today)
            if (i === 0) {
                const now = new Date();
                const sessionTime = new Date(date);
                const [hours, minutes] = session.startTime.split(':').map(Number);
                sessionTime.setHours(hours, minutes);
                
                if (sessionTime <= now) continue;
            }
            
            // Count current bookings for this session
            const bookingCount = await Booking.countDocuments({
                class: classItem._id,
                date: date.toISOString().split('T')[0],
                startTime: session.startTime,
                status: { $in: ['confirmed', 'pending'] }
            });
            
            upcomingSessions.push({
                date: date.toISOString().split('T')[0],
                dayName: dayName,
                startTime: session.startTime,
                endTime: session.endTime,
                room: session.room,
                availableSpots: classItem.maxParticipants - bookingCount,
                isFullyBooked: bookingCount >= classItem.maxParticipants
            });
        }
    }

    res.json(
        createResponse(true, 'Class retrieved successfully', { 
            class: classItem,
            upcomingSessions: upcomingSessions.slice(0, 10) // Limit to 10 upcoming sessions
        })
    );
}));

// @desc    Book a class
// @route   POST /api/classes/:id/book
// @access  Private
router.post('/:id/book', authenticate, asyncHandler(async (req, res) => {
    const { date, startTime } = req.body;

    const classItem = await Class.findOne({ _id: req.params.id, isActive: true });

    if (!classItem) {
        return res.status(404).json(
            createResponse(false, 'Class not found')
        );
    }

    // Validate date and time
    const bookingDate = new Date(date);
    const today = new Date();
    
    if (bookingDate < today.setHours(0, 0, 0, 0)) {
        return res.status(400).json(
            createResponse(false, 'Cannot book classes in the past')
        );
    }

    // Check if the class runs on this day and time
    const dayName = bookingDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const session = classItem.schedule.find(s => s.day === dayName && s.startTime === startTime);

    if (!session) {
        return res.status(400).json(
            createResponse(false, 'Class does not run on this day and time')
        );
    }

    // Check if user already has a booking for this session
    const existingBooking = await Booking.findOne({
        user: req.user._id,
        class: classItem._id,
        date: date,
        startTime: startTime,
        status: { $in: ['confirmed', 'pending'] }
    });

    if (existingBooking) {
        return res.status(400).json(
            createResponse(false, 'You already have a booking for this session')
        );
    }

    // Check availability
    const currentBookings = await Booking.countDocuments({
        class: classItem._id,
        date: date,
        startTime: startTime,
        status: { $in: ['confirmed', 'pending'] }
    });

    if (currentBookings >= classItem.maxParticipants) {
        return res.status(400).json(
            createResponse(false, 'This class session is fully booked')
        );
    }

    // Calculate duration
    const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endMinutes = parseInt(session.endTime.split(':')[0]) * 60 + parseInt(session.endTime.split(':')[1]);
    const duration = endMinutes - startMinutes;

    // Create booking
    const booking = await Booking.create({
        user: req.user._id,
        type: 'class',
        class: classItem._id,
        date: bookingDate,
        startTime: startTime,
        endTime: session.endTime,
        duration: duration,
        payment: {
            amount: classItem.price?.dropIn || 0,
            method: 'membership', // Assume covered by membership for now
            status: 'paid'
        }
    });

    // Populate booking details
    await booking.populate([
        {
            path: 'class',
            select: 'name description instructor',
            populate: {
                path: 'instructor',
                populate: {
                    path: 'user',
                    select: 'firstName lastName'
                }
            }
        }
    ]);

    // Send confirmation email
    await sendEmail(req.user.email, 'bookingConfirmation', {
        name: req.user.firstName,
        bookingDetails: {
            type: 'Class',
            class: classItem.name,
            date: formatDate(bookingDate),
            startTime: formatTime(startTime),
            endTime: formatTime(session.endTime),
            trainer: booking.class.instructor?.user ? 
                `${booking.class.instructor.user.firstName} ${booking.class.instructor.user.lastName}` : 
                'TBA'
        }
    });

    res.status(201).json(
        createResponse(true, 'Class booked successfully', { booking })
    );
}));

// @desc    Cancel class booking
// @route   DELETE /api/classes/bookings/:bookingId
// @access  Private
router.delete('/bookings/:bookingId', authenticate, asyncHandler(async (req, res) => {
    const booking = await Booking.findOne({
        _id: req.params.bookingId,
        user: req.user._id,
        type: 'class'
    });

    if (!booking) {
        return res.status(404).json(
            createResponse(false, 'Booking not found')
        );
    }

    // Check if booking can be cancelled
    const canCancel = booking.canBeCancelled();
    
    if (!canCancel.canCancel) {
        return res.status(400).json(
            createResponse(false, canCancel.reason)
        );
    }

    // Cancel booking
    booking.status = 'cancelled';
    booking.cancellation = {
        cancelledAt: new Date(),
        cancelledBy: req.user._id,
        reason: 'User cancellation'
    };

    await booking.save();

    res.json(
        createResponse(true, 'Booking cancelled successfully')
    );
}));

// @desc    Get user's class bookings
// @route   GET /api/classes/my-bookings
// @access  Private
router.get('/my-bookings', authenticate, asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, upcoming } = req.query;

    // Build query
    let query = { user: req.user._id, type: 'class' };

    if (status) {
        query.status = status;
    }

    if (upcoming === 'true') {
        query.date = { $gte: new Date() };
        query.status = { $in: ['confirmed', 'pending'] };
    }

    // Get pagination info
    const total = await Booking.countDocuments(query);
    const pagination = getPaginationInfo(page, limit, total);

    // Get bookings
    const bookings = await Booking.find(query)
        .populate({
            path: 'class',
            select: 'name description category difficulty',
            populate: {
                path: 'instructor',
                populate: {
                    path: 'user',
                    select: 'firstName lastName'
                }
            }
        })
        .sort({ date: -1, startTime: -1 })
        .skip(pagination.skip)
        .limit(pagination.itemsPerPage);

    res.json(
        createResponse(true, 'Bookings retrieved successfully', { bookings }, pagination)
    );
}));

// Admin routes

// @desc    Create new class
// @route   POST /api/classes/admin
// @access  Private/Admin
router.post('/admin', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    // Validate instructor exists
    if (req.body.instructor) {
        const trainer = await Trainer.findById(req.body.instructor);
        if (!trainer) {
            return res.status(400).json(
                createResponse(false, 'Trainer not found')
            );
        }
    }

    const classItem = await Class.create(req.body);
    
    await classItem.populate('instructor', 'user specializations');

    res.status(201).json(
        createResponse(true, 'Class created successfully', { class: classItem })
    );
}));

// @desc    Update class
// @route   PUT /api/classes/admin/:id
// @access  Private/Admin
router.put('/admin/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const classItem = await Class.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    ).populate('instructor', 'user specializations');

    if (!classItem) {
        return res.status(404).json(
            createResponse(false, 'Class not found')
        );
    }

    res.json(
        createResponse(true, 'Class updated successfully', { class: classItem })
    );
}));

// @desc    Delete class
// @route   DELETE /api/classes/admin/:id
// @access  Private/Admin
router.delete('/admin/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const classItem = await Class.findById(req.params.id);

    if (!classItem) {
        return res.status(404).json(
            createResponse(false, 'Class not found')
        );
    }

    // Check if there are future bookings
    const futureBookings = await Booking.countDocuments({
        class: classItem._id,
        date: { $gte: new Date() },
        status: { $in: ['confirmed', 'pending'] }
    });

    if (futureBookings > 0) {
        return res.status(400).json(
            createResponse(false, 'Cannot delete class with future bookings')
        );
    }

    // Soft delete
    classItem.isActive = false;
    await classItem.save();

    res.json(
        createResponse(true, 'Class deleted successfully')
    );
}));

// @desc    Get class statistics
// @route   GET /api/classes/admin/stats
// @access  Private/Admin
router.get('/admin/stats', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const totalClasses = await Class.countDocuments({ isActive: true });
    
    const categoryStats = await Class.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const difficultyStats = await Class.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$difficulty', count: { $sum: 1 } } }
    ]);

    const bookingStats = await Booking.aggregate([
        { $match: { type: 'class', status: { $in: ['confirmed', 'completed'] } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const popularClasses = await Booking.aggregate([
        { $match: { type: 'class', status: { $in: ['confirmed', 'completed'] } } },
        { $group: { _id: '$class', bookingCount: { $sum: 1 } } },
        { $sort: { bookingCount: -1 } },
        { $limit: 5 },
        {
            $lookup: {
                from: 'classes',
                localField: '_id',
                foreignField: '_id',
                as: 'class'
            }
        },
        { $unwind: '$class' },
        {
            $project: {
                name: '$class.name',
                category: '$class.category',
                bookingCount: 1
            }
        }
    ]);

    res.json(
        createResponse(true, 'Class statistics retrieved', {
            totalClasses,
            categoryStats,
            difficultyStats,
            bookingStats,
            popularClasses
        })
    );
}));

module.exports = router;