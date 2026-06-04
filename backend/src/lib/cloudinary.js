const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary — credentials come from env vars
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Create a multer upload middleware backed by Cloudinary.
 *
 * @param {object} options
 * @param {string} options.folder   - Cloudinary folder name (e.g. 'eduverse/lessons')
 * @param {string[]} options.allowedFormats - e.g. ['mp4', 'pdf', 'jpg', 'png']
 * @param {string} options.resourceType - 'video' | 'image' | 'raw' | 'auto'
 * @param {number} options.fileSizeMb - max file size in MB (default 50)
 */
function createUploader({ folder, allowedFormats, resourceType = 'auto', fileSizeMb = 50 }) {
    const storage = new CloudinaryStorage({
        cloudinary,
        params: async (req, file) => ({
            folder,
            resource_type: resourceType,
            allowed_formats: allowedFormats,
            // Use the original filename (without extension) as public_id prefix
            public_id: `${Date.now()}-${file.originalname.replace(/\.[^.]+$/, '').replace(/\s+/g, '_')}`,
        }),
    });

    return multer({
        storage,
        limits: { fileSize: fileSizeMb * 1024 * 1024 },
    });
}

module.exports = { cloudinary, createUploader };
