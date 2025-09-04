const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = 'uploads/';
        
        // Organize uploads by type
        if (file.fieldname === 'profileImage') {
            uploadPath += 'profiles/';
        } else if (file.fieldname === 'classImage') {
            uploadPath += 'classes/';
        } else if (file.fieldname === 'trainerImage') {
            uploadPath += 'trainers/';
        } else {
            uploadPath += 'misc/';
        }
        
        const fullPath = path.join(__dirname, '../../', uploadPath);
        ensureDirectoryExists(fullPath);
        
        cb(null, fullPath);
    },
    filename: function (req, file, cb) {
        // Create unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = file.fieldname + '-' + uniqueSuffix + ext;
        cb(null, name);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Check file type
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, JPG, PNG, WebP) are allowed'), false);
    }
};

// Upload middleware
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
        files: 5 // Maximum 5 files per request
    },
    fileFilter: fileFilter
});

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 5MB.'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Maximum 5 files allowed.'
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected file field.'
            });
        }
    }
    
    if (err.message.includes('Only image files')) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    
    next(err);
};

// Utility function to delete file
const deleteFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
};

module.exports = {
    upload,
    handleUploadError,
    deleteFile
};