const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};

// Generate random string
const generateRandomString = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

// Format date to readable string
const formatDate = (date, options = {}) => {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    
    return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

// Format time to readable string
const formatTime = (time24) => {
    const [hours, minutes] = time24.split(':');
    const hour12 = hours % 12 || 12;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${hour12}:${minutes} ${ampm}`;
};

// Calculate age from date of birth
const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
};

// Validate email format
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validate phone number (basic US format)
const isValidPhone = (phone) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
};

// Sanitize string (remove HTML tags and trim)
const sanitizeString = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '').trim();
};

// Generate pagination info
const getPaginationInfo = (page, limit, total) => {
    const currentPage = parseInt(page) || 1;
    const itemsPerPage = parseInt(limit) || 10;
    const totalItems = parseInt(total) || 0;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const skip = (currentPage - 1) * itemsPerPage;
    
    return {
        currentPage,
        itemsPerPage,
        totalItems,
        totalPages,
        skip,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
        nextPage: currentPage < totalPages ? currentPage + 1 : null,
        prevPage: currentPage > 1 ? currentPage - 1 : null
    };
};

// Create API response format
const createResponse = (success, message, data = null, pagination = null) => {
    const response = {
        success,
        message
    };
    
    if (data !== null) {
        response.data = data;
    }
    
    if (pagination) {
        response.pagination = pagination;
    }
    
    return response;
};

// Convert time string to minutes
const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

// Convert minutes to time string
const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Check if time slot conflicts with existing slots
const hasTimeConflict = (newStart, newEnd, existingSlots) => {
    const newStartMin = timeToMinutes(newStart);
    const newEndMin = timeToMinutes(newEnd);
    
    return existingSlots.some(slot => {
        const existingStartMin = timeToMinutes(slot.startTime);
        const existingEndMin = timeToMinutes(slot.endTime);
        
        return (newStartMin < existingEndMin && newEndMin > existingStartMin);
    });
};

// Generate slug from string
const generateSlug = (str) => {
    return str
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// Calculate BMI
const calculateBMI = (weightKg, heightCm) => {
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    return Math.round(bmi * 10) / 10;
};

// Get BMI category
const getBMICategory = (bmi) => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
};

// Async wrapper for controllers
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Deep merge objects
const deepMerge = (target, source) => {
    const result = { ...target };
    
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(result[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }
    
    return result;
};

module.exports = {
    generateToken,
    generateRandomString,
    formatDate,
    formatTime,
    calculateAge,
    isValidEmail,
    isValidPhone,
    sanitizeString,
    getPaginationInfo,
    createResponse,
    timeToMinutes,
    minutesToTime,
    hasTimeConflict,
    generateSlug,
    calculateBMI,
    getBMICategory,
    asyncHandler,
    deepMerge
};