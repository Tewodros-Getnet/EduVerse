/**
 * cloudinary.js — cloudinary v1 + multer-storage-cloudinary v4
 *
 * Correct pairing: cloudinary@^1.x  <->  multer-storage-cloudinary@4.x
 * The v1 SDK exposes the configured instance as require('cloudinary').v2
 */
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Warn at startup so it's immediately visible in Render logs
if (!process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME === 'your_cloud_name') {
    console.warn('⚠️  CLOUDINARY_CLOUD_NAME not set — file uploads will fail');
}

/**
 * Create a multer upload middleware backed by Cloudinary.
 *
 * @param {object}   options
 * @param {string}   options.folder          e.g. 'eduverse/avatars'
 * @param {string[]} options.allowedFormats  e.g. ['jpg','jpeg','png','webp']
 * @param {string}   options.resourceType    'image' | 'video' | 'raw' | 'auto'
 * @param {number}   options.fileSizeMb      max file size in MB (default 50)
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
 * Safe multer middleware wrapper.
 *
 * multer and multer-storage-cloudinary errors (wrong file type, file too large,
 * missing Cloudinary credentials, network errors) are NOT Express errors —
 * they are passed to the multer callback and bypass the global errorHandler.
 * Without this wrapper the request hangs with no response.
 *
 * Usage:
 *   router.post('/avatar', authenticate, uploadSingle(avatarUpload, 'avatar'), handler)
 */
function uploadSingle(uploader, fieldName) {
    return (req, res, next) => {
        uploader.single(fieldName)(req, res, (err) => {
            if (!err) return next();

            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    error: `File too large. Maximum allowed size exceeded.`,
                });
            }
            if (err.name === 'MulterError') {
                return res.status(400).json({ error: err.message });
            }
            // Cloudinary / network errors
            console.error('Upload error:', err.message || err);
            return res.status(500).json({
                error: 'File upload failed. Check server logs for details.',
            });
        });
    };
}

module.exports = { cloudinary, createUploader, uploadSingle };
