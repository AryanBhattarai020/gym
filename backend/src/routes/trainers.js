const express = require('express');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { createResponse, getPaginationInfo } = require('../utils/helpers');
const Trainer = require('../models/Trainer');
const User = require('../models/User');
const Booking = require('../models/Booking');

const router = express.Router();

// @desc    Get all trainers
// @route   GET /api/trainers
// @access  Public
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        specialization,
        minRating,
        available,
        search,
        sortBy = 'rating.average',
        sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = { isActive: true };

    if (specialization) {
        query.specializations = { $in: [specialization] };
    }

    if (minRating) {
        query['rating.average'] = { $gte: parseFloat(minRating) };
    }

    // Get pagination info
    const total = await Trainer.countDocuments(query);
    const pagination = getPaginationInfo(page, limit, total);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get trainers
    let trainers = await Trainer.find(query)
        .populate('user', 'firstName lastName email profileImage')
        .sort(sort)
        .skip(pagination.skip)
        .limit(pagination.itemsPerPage);

    // Apply search filter after population if needed
    if (search) {
        trainers = trainers.filter(trainer => 
            trainer.user.firstName.toLowerCase().includes(search.toLowerCase()) ||
            trainer.user.lastName.toLowerCase().includes(search.toLowerCase()) ||
            trainer.bio.toLowerCase().includes(search.toLowerCase()) ||
            trainer.specializations.some(spec => spec.toLowerCase().includes(search.toLowerCase()))
        );
    }

    res.json(
        createResponse(true, 'Trainers retrieved successfully', { trainers }, pagination)
    );
}));

// @desc    Get single trainer
// @route   GET /api/trainers/:id
// @access  Public
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
    const trainer = await Trainer.findOne({ _id: req.params.id, isActive: true })
        .populate('user', 'firstName lastName email profileImage phone');

    if (!trainer) {
        return res.status(404).json(
            createResponse(false, 'Trainer not found')
        );
    }

    // Get trainer's upcoming availability (next 7 days)
    const availability = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        const dayAvailability = trainer.availability.find(avail => avail.day === dayName);
        
        if (dayAvailability) {
            // Get existing bookings for this day
            const existingBookings = await Booking.find({
                trainer: trainer._id,
                date: date.toISOString().split('T')[0],
                status: { $in: ['confirmed', 'pending'] }
            }).select('startTime endTime');

            availability.push({
                date: date.toISOString().split('T')[0],
                dayName: dayName,
                startTime: dayAvailability.startTime,
                endTime: dayAvailability.endTime,
                existingBookings: existingBookings
            });
        }
    }

    res.json(
        createResponse(true, 'Trainer retrieved successfully', { 
            trainer,
            availability
        })
    );
}));

// @desc    Book personal training session
// @route   POST /api/trainers/:id/book
// @access  Private
router.post('/:id/book', authenticate, asyncHandler(async (req, res) => {
    const { date, startTime, duration = 60, notes } = req.body;

    const trainer = await Trainer.findOne({ _id: req.params.id, isActive: true })
        .populate('user', 'firstName lastName');

    if (!trainer) {
        return res.status(404).json(
            createResponse(false, 'Trainer not found')
        );
    }

    // Validate date and time
    const bookingDate = new Date(date);
    const today = new Date();
    
    if (bookingDate < today.setHours(0, 0, 0, 0)) {
        return res.status(400).json(
            createResponse(false, 'Cannot book sessions in the past')
        );
    }

    // Check if trainer is available on this day and time
    const dayName = bookingDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const isAvailable = trainer.isAvailable(dayName, startTime);

    if (!isAvailable) {
        return res.status(400).json(
            createResponse(false, 'Trainer is not available at this time')
        );
    }

    // Calculate end time
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    // Check for conflicts with existing bookings
    const existingBookings = await Booking.find({
        trainer: trainer._id,
        date: date,
        status: { $in: ['confirmed', 'pending'] }
    });

    const hasConflict = existingBookings.some(booking => {
        const bookingStart = booking.startTime;
        const bookingEnd = booking.endTime;
        
        return (startTime < bookingEnd && endTime > bookingStart);
    });

    if (hasConflict) {
        return res.status(400).json(
            createResponse(false, 'This time slot conflicts with an existing booking')
        );
    }

    // Calculate cost
    const cost = trainer.hourlyRate * (duration / 60);

    // Create booking
    const booking = await Booking.create({
        user: req.user._id,
        type: 'personal_training',
        trainer: trainer._id,
        date: bookingDate,
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        notes: {
            user: notes
        },
        payment: {
            amount: cost,
            method: 'pending', // Will be updated when payment is processed
            status: 'pending'
        }
    });

    // Populate booking details
    await booking.populate([
        {
            path: 'trainer',
            populate: {
                path: 'user',
                select: 'firstName lastName'
            }
        }
    ]);

    res.status(201).json(
        createResponse(true, 'Personal training session booked successfully', { booking })
    );
}));

// @desc    Get trainer's schedule
// @route   GET /api/trainers/:id/schedule
// @access  Private/Trainer/Admin
router.get('/:id/schedule', authenticate, asyncHandler(async (req, res) => {
    const trainer = await Trainer.findById(req.params.id);

    if (!trainer) {
        return res.status(404).json(
            createResponse(false, 'Trainer not found')
        );
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user._id.toString() !== trainer.user.toString()) {
        return res.status(403).json(
            createResponse(false, 'Access denied')
        );
    }

    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Get bookings for the date range
    const bookings = await Booking.find({
        trainer: trainer._id,
        date: { $gte: start, $lte: end },
        status: { $in: ['confirmed', 'pending'] }
    })
    .populate('user', 'firstName lastName email phone')
    .sort({ date: 1, startTime: 1 });

    res.json(
        createResponse(true, 'Trainer schedule retrieved successfully', { 
            trainer: trainer.availability,
            bookings
        })
    );
}));

// Admin routes

// @desc    Create trainer profile
// @route   POST /api/trainers/admin
// @access  Private/Admin
router.post('/admin', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const { userId, ...trainerData } = req.body;

    // Check if user exists and is not already a trainer
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json(
            createResponse(false, 'User not found')
        );
    }

    const existingTrainer = await Trainer.findOne({ user: userId });
    if (existingTrainer) {
        return res.status(400).json(
            createResponse(false, 'User is already a trainer')
        );
    }

    // Create trainer profile
    const trainer = await Trainer.create({
        user: userId,
        ...trainerData
    });

    // Update user role
    user.role = 'trainer';
    await user.save();

    await trainer.populate('user', 'firstName lastName email');

    res.status(201).json(
        createResponse(true, 'Trainer profile created successfully', { trainer })
    );
}));

// @desc    Update trainer profile
// @route   PUT /api/trainers/admin/:id
// @access  Private/Admin
router.put('/admin/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const trainer = await Trainer.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    ).populate('user', 'firstName lastName email');

    if (!trainer) {
        return res.status(404).json(
            createResponse(false, 'Trainer not found')
        );
    }

    res.json(
        createResponse(true, 'Trainer profile updated successfully', { trainer })
    );
}));

// @desc    Deactivate trainer
// @route   DELETE /api/trainers/admin/:id
// @access  Private/Admin
router.delete('/admin/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const trainer = await Trainer.findById(req.params.id);

    if (!trainer) {
        return res.status(404).json(
            createResponse(false, 'Trainer not found')
        );
    }

    // Check for future bookings
    const futureBookings = await Booking.countDocuments({
        trainer: trainer._id,
        date: { $gte: new Date() },
        status: { $in: ['confirmed', 'pending'] }
    });

    if (futureBookings > 0) {
        return res.status(400).json(
            createResponse(false, 'Cannot deactivate trainer with future bookings')
        );
    }

    // Deactivate trainer
    trainer.isActive = false;
    await trainer.save();

    // Update user role back to member
    await User.findByIdAndUpdate(trainer.user, { role: 'member' });

    res.json(
        createResponse(true, 'Trainer deactivated successfully')
    );
}));

// @desc    Get trainer statistics
// @route   GET /api/trainers/admin/stats
// @access  Private/Admin
router.get('/admin/stats', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const totalTrainers = await Trainer.countDocuments({ isActive: true });
    
    const specializationStats = await Trainer.aggregate([
        { $match: { isActive: true } },
        { $unwind: '$specializations' },
        { $group: { _id: '$specializations', count: { $sum: 1 } } }
    ]);

    const bookingStats = await Booking.aggregate([
        { $match: { type: 'personal_training', status: { $in: ['confirmed', 'completed'] } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const topTrainers = await Booking.aggregate([
        { $match: { type: 'personal_training', status: 'completed' } },
        { $group: { _id: '$trainer', sessionCount: { $sum: 1 } } },
        { $sort: { sessionCount: -1 } },
        { $limit: 5 },
        {
            $lookup: {
                from: 'trainers',
                localField: '_id',
                foreignField: '_id',
                as: 'trainer'
            }
        },
        { $unwind: '$trainer' },
        {
            $lookup: {
                from: 'users',
                localField: 'trainer.user',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: '$user' },
        {
            $project: {
                name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                sessionCount: 1,
                rating: '$trainer.rating.average'
            }
        }
    ]);

    res.json(
        createResponse(true, 'Trainer statistics retrieved', {
            totalTrainers,
            specializationStats,
            bookingStats,
            topTrainers
        })
    );
}));

module.exports = router;