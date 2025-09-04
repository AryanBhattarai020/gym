const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const { asyncHandler } = require('../utils/helpers');
const { createResponse, getPaginationInfo } = require('../utils/helpers');
const User = require('../models/User');
const Booking = require('../models/Booking');

const router = express.Router();

// @desc    Upload profile image
// @route   POST /api/users/upload-profile-image
// @access  Private
router.post('/upload-profile-image', 
    authenticate, 
    upload.single('profileImage'), 
    handleUploadError,
    asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json(
                createResponse(false, 'No image file provided')
            );
        }

        // Update user profile image
        const user = await User.findById(req.user._id);
        user.profileImage = `/uploads/profiles/${req.file.filename}`;
        await user.save();

        res.json(
            createResponse(true, 'Profile image uploaded successfully', {
                profileImage: user.profileImage
            })
        );
    })
);

// @desc    Get user dashboard data
// @route   GET /api/users/dashboard
// @access  Private
router.get('/dashboard', authenticate, asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Get upcoming bookings
    const upcomingBookings = await Booking.find({
        user: userId,
        date: { $gte: new Date() },
        status: { $in: ['confirmed', 'pending'] }
    })
    .populate('class', 'name category')
    .populate('trainer', 'user')
    .populate('trainer.user', 'firstName lastName')
    .sort({ date: 1, startTime: 1 })
    .limit(5);

    // Get recent bookings
    const recentBookings = await Booking.find({
        user: userId,
        status: 'completed'
    })
    .populate('class', 'name category')
    .populate('trainer', 'user')
    .populate('trainer.user', 'firstName lastName')
    .sort({ date: -1 })
    .limit(5);

    // Get booking statistics
    const bookingStats = await Booking.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get monthly booking count for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyBookings = await Booking.aggregate([
        {
            $match: {
                user: userId,
                date: { $gte: sixMonthsAgo },
                status: 'completed'
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$date' },
                    month: { $month: '$date' }
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json(
        createResponse(true, 'Dashboard data retrieved successfully', {
            upcomingBookings,
            recentBookings,
            bookingStats,
            monthlyBookings
        })
    );
}));

// @desc    Get user bookings
// @route   GET /api/users/bookings
// @access  Private
router.get('/bookings', authenticate, asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        type,
        status,
        upcoming
    } = req.query;

    // Build query
    let query = { user: req.user._id };

    if (type) {
        query.type = type;
    }

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
        .populate('class', 'name description category difficulty')
        .populate({
            path: 'trainer',
            populate: {
                path: 'user',
                select: 'firstName lastName profileImage'
            }
        })
        .sort({ date: -1, startTime: -1 })
        .skip(pagination.skip)
        .limit(pagination.itemsPerPage);

    res.json(
        createResponse(true, 'Bookings retrieved successfully', { bookings }, pagination)
    );
}));

// @desc    Cancel booking
// @route   PUT /api/users/bookings/:id/cancel
// @access  Private
router.put('/bookings/:id/cancel', authenticate, asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const booking = await Booking.findOne({
        _id: req.params.id,
        user: req.user._id
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

    // Calculate refund
    const refundAmount = booking.calculateRefund();

    // Cancel booking
    booking.status = 'cancelled';
    booking.cancellation = {
        cancelledAt: new Date(),
        cancelledBy: req.user._id,
        reason: reason || 'User cancellation',
        refundAmount
    };

    await booking.save();

    res.json(
        createResponse(true, 'Booking cancelled successfully', {
            booking,
            refundAmount
        })
    );
}));

// @desc    Submit booking feedback
// @route   POST /api/users/bookings/:id/feedback
// @access  Private
router.post('/bookings/:id/feedback', authenticate, asyncHandler(async (req, res) => {
    const { rating, comment } = req.body;

    const booking = await Booking.findOne({
        _id: req.params.id,
        user: req.user._id,
        status: 'completed'
    });

    if (!booking) {
        return res.status(404).json(
            createResponse(false, 'Completed booking not found')
        );
    }

    if (booking.feedback.rating) {
        return res.status(400).json(
            createResponse(false, 'Feedback already submitted for this booking')
        );
    }

    // Add feedback
    booking.feedback = {
        rating,
        comment,
        submittedAt: new Date()
    };

    await booking.save();

    // Update trainer rating if it's a personal training session
    if (booking.type === 'personal_training' && booking.trainer) {
        const Trainer = require('../models/Trainer');
        const trainer = await Trainer.findById(booking.trainer);
        
        if (trainer) {
            const totalRating = trainer.rating.average * trainer.rating.totalReviews + rating;
            trainer.rating.totalReviews += 1;
            trainer.rating.average = totalRating / trainer.rating.totalReviews;
            await trainer.save();
        }
    }

    // Update class rating if it's a class booking
    if (booking.type === 'class' && booking.class) {
        const Class = require('../models/Class');
        const classItem = await Class.findById(booking.class);
        
        if (classItem) {
            const totalRating = classItem.averageRating * classItem.totalReviews + rating;
            classItem.totalReviews += 1;
            classItem.averageRating = totalRating / classItem.totalReviews;
            await classItem.save();
        }
    }

    res.json(
        createResponse(true, 'Feedback submitted successfully', { booking })
    );
}));

// Admin routes

// @desc    Get all users
// @route   GET /api/users/admin/all
// @access  Private/Admin
router.get('/admin/all', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        role,
        membershipStatus,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};

    if (role) {
        query.role = role;
    }

    if (membershipStatus) {
        query.membershipStatus = membershipStatus;
    }

    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    // Get pagination info
    const total = await User.countDocuments(query);
    const pagination = getPaginationInfo(page, limit, total);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get users
    const users = await User.find(query)
        .populate('membership', 'planName price')
        .select('-password')
        .sort(sort)
        .skip(pagination.skip)
        .limit(pagination.itemsPerPage);

    res.json(
        createResponse(true, 'Users retrieved successfully', { users }, pagination)
    );
}));

// @desc    Get user by ID
// @route   GET /api/users/admin/:id
// @access  Private/Admin
router.get('/admin/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id)
        .populate('membership', 'planName price features')
        .select('-password');

    if (!user) {
        return res.status(404).json(
            createResponse(false, 'User not found')
        );
    }

    // Get user's booking statistics
    const bookingStats = await Booking.aggregate([
        { $match: { user: user._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json(
        createResponse(true, 'User retrieved successfully', { user, bookingStats })
    );
}));

// @desc    Update user by admin
// @route   PUT /api/users/admin/:id
// @access  Private/Admin
router.put('/admin/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
        return res.status(404).json(
            createResponse(false, 'User not found')
        );
    }

    res.json(
        createResponse(true, 'User updated successfully', { user })
    );
}));

// @desc    Deactivate user
// @route   DELETE /api/users/admin/:id
// @access  Private/Admin
router.delete('/admin/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(404).json(
            createResponse(false, 'User not found')
        );
    }

    // Deactivate instead of delete
    user.isActive = false;
    await user.save();

    res.json(
        createResponse(true, 'User deactivated successfully')
    );
}));

// @desc    Get user statistics
// @route   GET /api/users/admin/stats
// @access  Private/Admin
router.get('/admin/stats', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments({ isActive: true });
    
    const roleStats = await User.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const membershipStats = await User.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$membershipStatus', count: { $sum: 1 } } }
    ]);

    // New users in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsers = await User.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
        isActive: true
    });

    // Active users (logged in within last 30 days)
    const activeUsers = await User.countDocuments({
        lastLogin: { $gte: thirtyDaysAgo },
        isActive: true
    });

    res.json(
        createResponse(true, 'User statistics retrieved', {
            totalUsers,
            roleStats,
            membershipStats,
            newUsers,
            activeUsers
        })
    );
}));

module.exports = router;