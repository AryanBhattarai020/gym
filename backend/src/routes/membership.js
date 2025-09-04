const express = require('express');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { createResponse, getPaginationInfo } = require('../utils/helpers');
const { sendEmail } = require('../utils/email');
const Membership = require('../models/Membership');
const UserMembership = require('../models/UserMembership');
const User = require('../models/User');

const router = express.Router();

// @desc    Get all membership plans
// @route   GET /api/membership/plans
// @access  Public
router.get('/plans', asyncHandler(async (req, res) => {
    const plans = await Membership.find({ isActive: true })
        .sort({ sortOrder: 1, price: 1 });

    res.json(
        createResponse(true, 'Membership plans retrieved successfully', { plans })
    );
}));

// @desc    Get single membership plan
// @route   GET /api/membership/plans/:id
// @access  Public
router.get('/plans/:id', asyncHandler(async (req, res) => {
    const plan = await Membership.findOne({ _id: req.params.id, isActive: true });

    if (!plan) {
        return res.status(404).json(
            createResponse(false, 'Membership plan not found')
        );
    }

    res.json(
        createResponse(true, 'Membership plan retrieved successfully', { plan })
    );
}));

// @desc    Purchase membership
// @route   POST /api/membership/purchase
// @access  Private
router.post('/purchase', authenticate, asyncHandler(async (req, res) => {
    const { membershipId, billingCycle, paymentMethod, paymentDetails } = req.body;

    // Check if user already has active membership
    const existingMembership = await UserMembership.findOne({
        user: req.user._id,
        status: 'active'
    });

    if (existingMembership) {
        return res.status(400).json(
            createResponse(false, 'You already have an active membership')
        );
    }

    // Get membership plan
    const membershipPlan = await Membership.findOne({ _id: membershipId, isActive: true });

    if (!membershipPlan) {
        return res.status(404).json(
            createResponse(false, 'Membership plan not found')
        );
    }

    // Calculate dates and amount
    const startDate = new Date();
    const endDate = new Date();
    let amount;

    if (billingCycle === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
        amount = membershipPlan.price.yearly;
    } else {
        endDate.setMonth(endDate.getMonth() + 1);
        amount = membershipPlan.price.monthly;
    }

    // In a real application, you would process payment here
    // For now, we'll simulate a successful payment
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create user membership
    const userMembership = await UserMembership.create({
        user: req.user._id,
        membership: membershipId,
        startDate,
        endDate,
        billingCycle,
        paymentInfo: {
            amount,
            paymentMethod,
            transactionId
        }
    });

    // Update user membership status
    await User.findByIdAndUpdate(req.user._id, {
        membership: membershipId,
        membershipStatus: 'active'
    });

    // Populate the membership details
    await userMembership.populate('membership', 'planName price features');
    await userMembership.populate('user', 'firstName lastName email');

    // Send confirmation email
    await sendEmail(req.user.email, 'membershipConfirmation', {
        name: req.user.firstName,
        planName: membershipPlan.planName,
        amount,
        billingCycle,
        startDate: startDate.toDateString(),
        endDate: endDate.toDateString()
    });

    res.status(201).json(
        createResponse(true, 'Membership purchased successfully', { membership: userMembership })
    );
}));

// @desc    Get user's current membership
// @route   GET /api/membership/my-membership
// @access  Private
router.get('/my-membership', authenticate, asyncHandler(async (req, res) => {
    const membership = await UserMembership.findOne({
        user: req.user._id,
        status: { $in: ['active', 'expired'] }
    })
    .populate('membership', 'planName price features limits')
    .sort({ createdAt: -1 });

    if (!membership) {
        return res.json(
            createResponse(true, 'No membership found', { membership: null })
        );
    }

    res.json(
        createResponse(true, 'Membership retrieved successfully', { membership })
    );
}));

// @desc    Get user's membership history
// @route   GET /api/membership/history
// @access  Private
router.get('/history', authenticate, asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const total = await UserMembership.countDocuments({ user: req.user._id });
    const pagination = getPaginationInfo(page, limit, total);

    const memberships = await UserMembership.find({ user: req.user._id })
        .populate('membership', 'planName price')
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.itemsPerPage);

    res.json(
        createResponse(true, 'Membership history retrieved successfully', { memberships }, pagination)
    );
}));

// @desc    Cancel membership
// @route   POST /api/membership/cancel
// @access  Private
router.post('/cancel', authenticate, asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const membership = await UserMembership.findOne({
        user: req.user._id,
        status: 'active'
    });

    if (!membership) {
        return res.status(404).json(
            createResponse(false, 'No active membership found')
        );
    }

    // Update membership status
    membership.status = 'cancelled';
    membership.cancelledAt = new Date();
    membership.cancelledBy = req.user._id;
    membership.cancellationReason = reason;
    membership.autoRenew = false;

    await membership.save();

    // Update user membership status
    await User.findByIdAndUpdate(req.user._id, {
        membershipStatus: 'cancelled'
    });

    // Send cancellation confirmation email
    await sendEmail(req.user.email, 'membershipCancellation', {
        name: req.user.firstName,
        endDate: membership.endDate.toDateString()
    });

    res.json(
        createResponse(true, 'Membership cancelled successfully', { membership })
    );
}));

// @desc    Reactivate membership
// @route   POST /api/membership/reactivate
// @access  Private
router.post('/reactivate', authenticate, asyncHandler(async (req, res) => {
    const membership = await UserMembership.findOne({
        user: req.user._id,
        status: 'cancelled'
    }).populate('membership');

    if (!membership) {
        return res.status(404).json(
            createResponse(false, 'No cancelled membership found')
        );
    }

    // Check if membership is still within grace period (e.g., 30 days)
    const gracePeriod = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    const timeSinceCancellation = Date.now() - membership.cancelledAt.getTime();

    if (timeSinceCancellation > gracePeriod) {
        return res.status(400).json(
            createResponse(false, 'Membership cannot be reactivated. Grace period expired.')
        );
    }

    // Reactivate membership
    membership.status = 'active';
    membership.cancelledAt = undefined;
    membership.cancelledBy = undefined;
    membership.cancellationReason = undefined;
    membership.autoRenew = true;

    await membership.save();

    // Update user membership status
    await User.findByIdAndUpdate(req.user._id, {
        membershipStatus: 'active'
    });

    res.json(
        createResponse(true, 'Membership reactivated successfully', { membership })
    );
}));

// @desc    Update auto-renewal setting
// @route   PUT /api/membership/auto-renew
// @access  Private
router.put('/auto-renew', authenticate, asyncHandler(async (req, res) => {
    const { autoRenew } = req.body;

    const membership = await UserMembership.findOne({
        user: req.user._id,
        status: 'active'
    });

    if (!membership) {
        return res.status(404).json(
            createResponse(false, 'No active membership found')
        );
    }

    membership.autoRenew = autoRenew;
    await membership.save();

    res.json(
        createResponse(true, 'Auto-renewal setting updated successfully', { membership })
    );
}));

// Admin routes

// @desc    Create membership plan
// @route   POST /api/membership/admin/plans
// @access  Private/Admin
router.post('/admin/plans', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const plan = await Membership.create(req.body);

    res.status(201).json(
        createResponse(true, 'Membership plan created successfully', { plan })
    );
}));

// @desc    Update membership plan
// @route   PUT /api/membership/admin/plans/:id
// @access  Private/Admin
router.put('/admin/plans/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const plan = await Membership.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!plan) {
        return res.status(404).json(
            createResponse(false, 'Membership plan not found')
        );
    }

    res.json(
        createResponse(true, 'Membership plan updated successfully', { plan })
    );
}));

// @desc    Delete membership plan
// @route   DELETE /api/membership/admin/plans/:id
// @access  Private/Admin
router.delete('/admin/plans/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const plan = await Membership.findById(req.params.id);

    if (!plan) {
        return res.status(404).json(
            createResponse(false, 'Membership plan not found')
        );
    }

    // Soft delete - just mark as inactive
    plan.isActive = false;
    await plan.save();

    res.json(
        createResponse(true, 'Membership plan deleted successfully')
    );
}));

// @desc    Get all user memberships (Admin)
// @route   GET /api/membership/admin/all
// @access  Private/Admin
router.get('/admin/all', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        status,
        membershipPlan,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};

    if (status) {
        query.status = status;
    }

    if (membershipPlan) {
        query.membership = membershipPlan;
    }

    // Get pagination info
    const total = await UserMembership.countDocuments(query);
    const pagination = getPaginationInfo(page, limit, total);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Build aggregation pipeline for search
    let pipeline = [
        {
            $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: '$user' },
        {
            $lookup: {
                from: 'memberships',
                localField: 'membership',
                foreignField: '_id',
                as: 'membership'
            }
        },
        { $unwind: '$membership' }
    ];

    if (search) {
        pipeline.push({
            $match: {
                $or: [
                    { 'user.firstName': { $regex: search, $options: 'i' } },
                    { 'user.lastName': { $regex: search, $options: 'i' } },
                    { 'user.email': { $regex: search, $options: 'i' } },
                    { 'membership.planName': { $regex: search, $options: 'i' } }
                ]
            }
        });
    }

    // Add other filters
    if (Object.keys(query).length > 0) {
        pipeline.push({ $match: query });
    }

    // Add sorting
    pipeline.push({ $sort: sort });

    // Add pagination
    pipeline.push(
        { $skip: pagination.skip },
        { $limit: pagination.itemsPerPage }
    );

    const memberships = await UserMembership.aggregate(pipeline);

    res.json(
        createResponse(true, 'User memberships retrieved successfully', { memberships }, pagination)
    );
}));

// @desc    Get membership statistics
// @route   GET /api/membership/admin/stats
// @access  Private/Admin
router.get('/admin/stats', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const totalMembers = await UserMembership.countDocuments({ status: 'active' });
    const totalRevenue = await UserMembership.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$paymentInfo.amount' } } }
    ]);

    const membershipStats = await UserMembership.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const planStats = await UserMembership.aggregate([
        { $match: { status: 'active' } },
        {
            $lookup: {
                from: 'memberships',
                localField: 'membership',
                foreignField: '_id',
                as: 'plan'
            }
        },
        { $unwind: '$plan' },
        {
            $group: {
                _id: '$plan.planName',
                count: { $sum: 1 },
                revenue: { $sum: '$paymentInfo.amount' }
            }
        }
    ]);

    // Get expiring memberships (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringMemberships = await UserMembership.countDocuments({
        status: 'active',
        endDate: { $lte: thirtyDaysFromNow }
    });

    res.json(
        createResponse(true, 'Membership statistics retrieved', {
            totalMembers,
            totalRevenue: totalRevenue[0]?.total || 0,
            membershipStats,
            planStats,
            expiringMemberships
        })
    );
}));

module.exports = router;