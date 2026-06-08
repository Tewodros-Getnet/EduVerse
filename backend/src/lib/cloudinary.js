/**
 * cloudinary.js — Cloudinary v2 + multer-storage-cloudinary v4 setup.
 *
 * cloudinary v2 changed the import: the top-level export IS the v2 instance,
 * so require('cloudinary') works directly — no .v2 needed.
 */
const cloudinary = require('cloudinary');          // v2: top-level IS the instance
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure once at module load — values come from Render env vars
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Warn at startup if creds are missing so it's obvious in Render logs
if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'your_cloud_name') {
    console.warn('⚠️  CLOUDINARY_CLOUD_NAME not configured — file uploads will fail');
}

/**
 * Create a multer upload middleware backed by Cloudinary.
 *
 * @param {object}   options
 * @param {string}   options.folder          Cloudinary folder, e.g. 'eduverse/avatars'
 * @param {string[]} options.allowedFormats  e.g. ['jpg','jpeg','png','webp']
 * @param {string}   options.resourceType    'image' | 'video' | 'raw' | 'auto'
 * @param {number}   options.fileSizeMb      Max file size in MB (default 50)
 */
function createUploader({ folder, allowedFormats, resourceType = 'auto', fileSizeMb = 50 }) {
    const storage = new CloudinaryStorage({
        cloudinary,
        params: async (req, file) => ({
            folder,
            resource_type: resourceType,
            allowed_formats: allowedFormats,
            public_id: `${Date.now()}-${file.originalname
                .replace(/\.[^.]+$/, '')
                .replace(/\s+/g, '_')}`,
        }),
    });

    return multer({
        storage,
        limits: { fileSize: fileSizeMb * 1024 * 1024 },
    });
}

/**
 * Express error-handling wrapper for multer middleware.
 * Multer throws MulterError objects that bypass the normal errorHandler —
 * this wrapper catches them and converts to a proper JSON 400 response.
 *
 * Usage:
 *   router.post('/avatar', authenticate, uploadSingle(avatarUpload, 'avatar'), handler)
 */
function uploadSingle(uploader, fieldName) {
    return (req, res, next) => {
        uploader.single(fieldName)(req, res, (err) => {
            if (!err) return next();

            // multer-specific errors (file too large, wrong type, etc.)
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: `File too large. Maximum size is ${err.field || 'allowed'} MB` });
            }
            if (err.name === 'MulterError') {
                return res.status(400).json({ error: err.message });
            }
            // Cloudinary errors (bad credentials, network, etc.)
            console.error('Cloudinary upload error:', err.message || err);
            return res.status(500).json({ error: 'File upload failed. Please try again.' });
        });
    };
}

module.exports = { cloudinary, createUploader, uploadSingle };
