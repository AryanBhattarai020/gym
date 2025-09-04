const express = require('express');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { createResponse, getPaginationInfo, sanitizeString } = require('../utils/helpers');
const { sendEmail } = require('../utils/email');
const Contact = require('../models/Contact');

const router = express.Router();

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
router.post('/', optionalAuth, asyncHandler(async (req, res) => {
    const { name, email, phone, subject, message } = req.body;

    // Sanitize inputs
    const sanitizedData = {
        name: sanitizeString(name),
        email: email.toLowerCase().trim(),
        phone: phone ? sanitizeString(phone) : undefined,
        subject,
        message: sanitizeString(message),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    };

    // Create contact entry
    const contact = await Contact.create(sanitizedData);

    // Send confirmation email to user
    await sendEmail(contact.email, 'contactConfirmation', {
        name: contact.name
    });

    // Send notification email to admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
        await sendEmail(adminEmail, 'newContactNotification', {
            name: contact.name,
            email: contact.email,
            subject: contact.subject,
            message: contact.message
        });
    }

    res.status(201).json(
        createResponse(true, 'Your message has been sent successfully. We\'ll get back to you soon!', {
            contactId: contact._id
        })
    );
}));

// @desc    Get all contacts (Admin only)
// @route   GET /api/contact
// @access  Private/Admin
router.get('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        status,
        priority,
        subject,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};

    if (status) {
        query.status = status;
    }

    if (priority) {
        query.priority = priority;
    }

    if (subject) {
        query.subject = subject;
    }

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { message: { $regex: search, $options: 'i' } }
        ];
    }

    // Get pagination info
    const total = await Contact.countDocuments(query);
    const pagination = getPaginationInfo(page, limit, total);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get contacts
    const contacts = await Contact.find(query)
        .populate('assignedTo', 'firstName lastName email')
        .populate('response.respondedBy', 'firstName lastName')
        .sort(sort)
        .skip(pagination.skip)
        .limit(pagination.itemsPerPage);

    res.json(
        createResponse(true, 'Contacts retrieved successfully', { contacts }, pagination)
    );
}));

// @desc    Get single contact
// @route   GET /api/contact/:id
// @access  Private/Admin
router.get('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const contact = await Contact.findById(req.params.id)
        .populate('assignedTo', 'firstName lastName email')
        .populate('response.respondedBy', 'firstName lastName')
        .populate('internalNotes.addedBy', 'firstName lastName');

    if (!contact) {
        return res.status(404).json(
            createResponse(false, 'Contact not found')
        );
    }

    res.json(
        createResponse(true, 'Contact retrieved successfully', { contact })
    );
}));

// @desc    Update contact status
// @route   PUT /api/contact/:id/status
// @access  Private/Admin
router.put('/:id/status', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const { status, assignedTo } = req.body;

    const contact = await Contact.findById(req.params.id);

    if (!contact) {
        return res.status(404).json(
            createResponse(false, 'Contact not found')
        );
    }

    if (status) {
        contact.status = status;
    }

    if (assignedTo) {
        contact.assignedTo = assignedTo;
    }

    await contact.save();

    await contact.populate('assignedTo', 'firstName lastName email');

    res.json(
        createResponse(true, 'Contact status updated successfully', { contact })
    );
}));

// @desc    Respond to contact
// @route   POST /api/contact/:id/respond
// @access  Private/Admin
router.post('/:id/respond', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const { message } = req.body;

    const contact = await Contact.findById(req.params.id);

    if (!contact) {
        return res.status(404).json(
            createResponse(false, 'Contact not found')
        );
    }

    // Update contact with response
    contact.response = {
        message: sanitizeString(message),
        respondedBy: req.user._id,
        respondedAt: new Date()
    };

    contact.status = 'resolved';
    await contact.save();

    // Send response email to user
    await sendEmail(contact.email, 'contactResponse', {
        name: contact.name,
        message: message
    });

    await contact.populate('response.respondedBy', 'firstName lastName');

    res.json(
        createResponse(true, 'Response sent successfully', { contact })
    );
}));

// @desc    Add internal note
// @route   POST /api/contact/:id/note
// @access  Private/Admin
router.post('/:id/note', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const { note } = req.body;

    const contact = await Contact.findById(req.params.id);

    if (!contact) {
        return res.status(404).json(
            createResponse(false, 'Contact not found')
        );
    }

    await contact.addInternalNote(sanitizeString(note), req.user._id);

    await contact.populate('internalNotes.addedBy', 'firstName lastName');

    res.json(
        createResponse(true, 'Note added successfully', { contact })
    );
}));

// @desc    Get contact statistics
// @route   GET /api/contact/stats
// @access  Private/Admin
router.get('/admin/stats', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const stats = await Contact.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const priorityStats = await Contact.aggregate([
        {
            $group: {
                _id: '$priority',
                count: { $sum: 1 }
            }
        }
    ]);

    const subjectStats = await Contact.aggregate([
        {
            $group: {
                _id: '$subject',
                count: { $sum: 1 }
            }
        }
    ]);

    // Get overdue contacts
    const overdueContacts = await Contact.getOverdue();

    // Get average resolution time
    const avgResolutionTime = await Contact.aggregate([
        {
            $match: {
                status: 'resolved',
                resolutionTime: { $exists: true }
            }
        },
        {
            $group: {
                _id: null,
                avgTime: { $avg: '$resolutionTime' }
            }
        }
    ]);

    res.json(
        createResponse(true, 'Contact statistics retrieved', {
            statusStats: stats,
            priorityStats,
            subjectStats,
            overdueCount: overdueContacts.length,
            averageResolutionTime: avgResolutionTime[0]?.avgTime || 0
        })
    );
}));

// @desc    Delete contact
// @route   DELETE /api/contact/:id
// @access  Private/Admin
router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
        return res.status(404).json(
            createResponse(false, 'Contact not found')
        );
    }

    await contact.deleteOne();

    res.json(
        createResponse(true, 'Contact deleted successfully')
    );
}));

module.exports = router;