const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { generateToken, createResponse } = require('../utils/helpers');
const { sendEmail } = require('../utils/email');
const User = require('../models/User');

const router = express.Router();

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', asyncHandler(async (req, res) => {
    const {
        firstName,
        lastName,
        email,
        password,
        phone,
        dateOfBirth,
        gender,
        emergencyContact,
        fitnessGoals,
        medicalConditions
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
        return res.status(400).json(
            createResponse(false, 'User with this email already exists')
        );
    }

    // Create user
    const user = await User.create({
        firstName,
        lastName,
        email: email.toLowerCase(),
        password,
        phone,
        dateOfBirth,
        gender,
        emergencyContact,
        fitnessGoals,
        medicalConditions
    });

    // Generate token
    const token = generateToken(user._id);

    // Send welcome email
    await sendEmail(user.email, 'welcome', { name: user.firstName });

    // Remove password from response
    user.password = undefined;

    res.status(201).json(
        createResponse(true, 'User registered successfully', {
            user,
            token
        })
    );
}));

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json(
            createResponse(false, 'Please provide email and password')
        );
    }

    // Check for user and include password
    const user = await User.findOne({ email: email.toLowerCase() })
        .select('+password')
        .populate('membership', 'planName price features');

    if (!user) {
        return res.status(401).json(
            createResponse(false, 'Invalid credentials')
        );
    }

    // Check if user is active
    if (!user.isActive) {
        return res.status(401).json(
            createResponse(false, 'Account is deactivated. Please contact support.')
        );
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
        return res.status(401).json(
            createResponse(false, 'Invalid credentials')
        );
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    user.password = undefined;

    res.json(
        createResponse(true, 'Login successful', {
            user,
            token
        })
    );
}));

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', authenticate, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
        .populate('membership', 'planName price features')
        .populate({
            path: 'membership',
            populate: {
                path: 'userMembership',
                model: 'UserMembership'
            }
        });

    res.json(
        createResponse(true, 'User profile retrieved', { user })
    );
}));

// @desc    Update user profile
// @route   PUT /api/auth/me
// @access  Private
router.put('/me', authenticate, asyncHandler(async (req, res) => {
    const {
        firstName,
        lastName,
        phone,
        dateOfBirth,
        gender,
        emergencyContact,
        fitnessGoals,
        medicalConditions,
        preferences
    } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json(
            createResponse(false, 'User not found')
        );
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (gender) user.gender = gender;
    if (emergencyContact) user.emergencyContact = emergencyContact;
    if (fitnessGoals) user.fitnessGoals = fitnessGoals;
    if (medicalConditions) user.medicalConditions = medicalConditions;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    res.json(
        createResponse(true, 'Profile updated successfully', { user })
    );
}));

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', authenticate, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json(
            createResponse(false, 'Please provide current and new password')
        );
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
        return res.status(400).json(
            createResponse(false, 'Current password is incorrect')
        );
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json(
        createResponse(true, 'Password changed successfully')
    );
}));

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', authenticate, (req, res) => {
    res.json(
        createResponse(true, 'Logged out successfully')
    );
});

// @desc    Delete user account
// @route   DELETE /api/auth/me
// @access  Private
router.delete('/me', authenticate, asyncHandler(async (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json(
            createResponse(false, 'Password is required to delete account')
        );
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
        return res.status(400).json(
            createResponse(false, 'Invalid password')
        );
    }

    // Deactivate instead of delete (for data integrity)
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`;
    await user.save();

    res.json(
        createResponse(true, 'Account deleted successfully')
    );
}));

module.exports = router;