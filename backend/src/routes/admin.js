const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { createResponse } = require('../utils/helpers');
const User = require('../models/User');
const Membership = require('../models/Membership');
const UserMembership = require('../models/UserMembership');
const Booking = require('../models/Booking');
const Contact = require('../models/Contact');
const Class = require('../models/Class');
const Trainer = require('../models/Trainer');

const router = express.Router();

// @desc    Get admin dashboard overview
// @route   GET /api/admin/dashboard
// @access  Private/Admin
router.get('/dashboard', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    // Get current date ranges
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // User statistics
    const totalUsers = await User.countDocuments({ isActive: true });
    const newUsersThisMonth = await User.countDocuments({
        createdAt: { $gte: startOfMonth },
        isActive: true
    });
    const activeUsers = await User.countDocuments({
        lastLogin: { $gte: thirtyDaysAgo },
        isActive: true
    });

    // Membership statistics
    const activeMembers = await UserMembership.countDocuments({ status: 'active' });
    const newMembersThisMonth = await UserMembership.countDocuments({
        createdAt: { $gte: startOfMonth },
        status: 'active'
    });
    
    // Revenue statistics
    const monthlyRevenue = await UserMembership.aggregate([
        {
            $match: {
                createdAt: { $gte: startOfMonth },
                status: { $in: ['active', 'completed'] }
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: '$paymentInfo.amount' }
            }
        }
    ]);

    const totalRevenue = await UserMembership.aggregate([
        {
            $match: {
                status: { $in: ['active', 'completed'] }
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: '$paymentInfo.amount' }
            }
        }
    ]);

    // Booking statistics
    const totalBookings = await Booking.countDocuments();
    const bookingsThisWeek = await Booking.countDocuments({
        createdAt: { $gte: startOfWeek }
    });
    const upcomingBookings = await Booking.countDocuments({
        date: { $gte: new Date() },
        status: { $in: ['confirmed', 'pending'] }
    });

    // Contact statistics
    const pendingContacts = await Contact.countDocuments({
        status: { $in: ['new', 'in_progress'] }
    });
    const newContactsToday = await Contact.countDocuments({
        createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    });

    // Class statistics
    const totalClasses = await Class.countDocuments({ isActive: true });
    const totalTrainers = await Trainer.countDocuments({ isActive: true });

    // Recent activity
    const recentUsers = await User.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('firstName lastName email createdAt');

    const recentBookings = await Booking.find()
        .populate('user', 'firstName lastName')
        .populate('class', 'name')
        .populate('trainer', 'user')
        .populate('trainer.user', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(5);

    const recentContacts = await Contact.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name email subject status createdAt');

    // Chart data - Monthly revenue for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenueChart = await UserMembership.aggregate([
        {
            $match: {
                createdAt: { $gte: sixMonthsAgo },
                status: { $in: ['active', 'completed'] }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                },
                revenue: { $sum: '$paymentInfo.amount' },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Booking trends - Daily bookings for last 30 days
    const bookingTrends = await Booking.aggregate([
        {
            $match: {
                createdAt: { $gte: thirtyDaysAgo }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json(
        createResponse(true, 'Admin dashboard data retrieved successfully', {
            stats: {
                users: {
                    total: totalUsers,
                    newThisMonth: newUsersThisMonth,
                    active: activeUsers
                },
                memberships: {
                    active: activeMembers,
                    newThisMonth: newMembersThisMonth
                },
                revenue: {
                    total: totalRevenue[0]?.total || 0,
                    thisMonth: monthlyRevenue[0]?.total || 0
                },
                bookings: {
                    total: totalBookings,
                    thisWeek: bookingsThisWeek,
                    upcoming: upcomingBookings
                },
                contacts: {
                    pending: pendingContacts,
                    newToday: newContactsToday
                },
                facilities: {
                    classes: totalClasses,
                    trainers: totalTrainers
                }
            },
            recentActivity: {
                users: recentUsers,
                bookings: recentBookings,
                contacts: recentContacts
            },
            charts: {
                monthlyRevenue: monthlyRevenueChart,
                bookingTrends: bookingTrends
            }
        })
    );
}));

// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Private/Admin
router.get('/settings', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    // In a real application, these would come from a settings collection
    const settings = {
        general: {
            siteName: 'Richard Fitness',
            siteDescription: 'Premium Gym & Fitness Center',
            contactEmail: process.env.ADMIN_EMAIL || 'admin@richardfitness.com',
            contactPhone: '(555) 123-4567',
            address: '123 Fitness Avenue, Downtown District, New York, NY 10001'
        },
        business: {
            currency: 'USD',
            timezone: 'America/New_York',
            operatingHours: {
                monday: { open: '05:00', close: '23:00' },
                tuesday: { open: '05:00', close: '23:00' },
                wednesday: { open: '05:00', close: '23:00' },
                thursday: { open: '05:00', close: '23:00' },
                friday: { open: '05:00', close: '23:00' },
                saturday: { open: '06:00', close: '22:00' },
                sunday: { open: '06:00', close: '22:00' }
            }
        },
        booking: {
            maxAdvanceBookingDays: 30,
            minCancellationHours: 2,
            maxBookingsPerUser: 10
        },
        notifications: {
            emailEnabled: true,
            smsEnabled: false,
            reminderTiming: [1440, 120, 30] // minutes before booking
        }
    };

    res.json(
        createResponse(true, 'Settings retrieved successfully', { settings })
    );
}));

// @desc    Update system settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
router.put('/settings', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    // In a real application, you would save these to a settings collection
    const { settings } = req.body;

    // For now, we'll just return success
    // In production, you would validate and save the settings
    
    res.json(
        createResponse(true, 'Settings updated successfully', { settings })
    );
}));

// @desc    Get system health check
// @route   GET /api/admin/health
// @access  Private/Admin
router.get('/health', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
        environment: process.env.NODE_ENV || 'development'
    };

    // Check database connection
    try {
        await User.findOne().limit(1);
        health.database = 'connected';
    } catch (error) {
        health.database = 'disconnected';
        health.status = 'unhealthy';
    }

    // Check email service
    const { testEmailConnection } = require('../utils/email');
    health.email = await testEmailConnection() ? 'connected' : 'disconnected';

    res.json(
        createResponse(true, 'Health check completed', { health })
    );
}));

// @desc    Get audit logs (placeholder)
// @route   GET /api/admin/audit-logs
// @access  Private/Admin
router.get('/audit-logs', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    // In a real application, you would have an audit log collection
    const auditLogs = [
        {
            id: '1',
            action: 'USER_LOGIN',
            userId: req.user._id,
            userEmail: req.user.email,
            timestamp: new Date(),
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        }
    ];

    res.json(
        createResponse(true, 'Audit logs retrieved successfully', { auditLogs })
    );
}));

// @desc    Export data
// @route   GET /api/admin/export/:type
// @access  Private/Admin
router.get('/export/:type', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const { type } = req.params;
    const { format = 'json', startDate, endDate } = req.query;

    let data = [];
    let filename = '';

    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    switch (type) {
        case 'users':
            data = await User.find(dateFilter).select('-password');
            filename = 'users_export';
            break;
        case 'bookings':
            data = await Booking.find(dateFilter)
                .populate('user', 'firstName lastName email')
                .populate('class', 'name category')
                .populate('trainer', 'user');
            filename = 'bookings_export';
            break;
        case 'memberships':
            data = await UserMembership.find(dateFilter)
                .populate('user', 'firstName lastName email')
                .populate('membership', 'planName price');
            filename = 'memberships_export';
            break;
        case 'contacts':
            data = await Contact.find(dateFilter);
            filename = 'contacts_export';
            break;
        default:
            return res.status(400).json(
                createResponse(false, 'Invalid export type')
            );
    }

    if (format === 'csv') {
        // In a real application, you would convert to CSV format
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send('CSV export not implemented yet');
    } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
        res.json(data);
    }
}));

module.exports = router;