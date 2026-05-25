const express = require('express');
const path = require('path');
const fs = require('fs');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const settingsPath = path.join(__dirname, '../../settings.json');

const defaultSettings = {
    platform_name: 'EduVerse',
    max_requests_per_min: 100,
    jwt_expiry: '1h',
    ai_model_groq: 'llama3-8b-8192',
    ai_model_gemini: 'gemini-pro',
    maintenance_mode: false,
    registration_open: true,
};

function loadSettings() {
    try {
        if (!fs.existsSync(settingsPath)) {
            fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
            return { ...defaultSettings };
        }

        const raw = fs.readFileSync(settingsPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return { ...defaultSettings, ...parsed };
    } catch (err) {
        console.error('Failed to load settings:', err.message);
        return { ...defaultSettings };
    }
}

function saveSettings(settings) {
    try {
        const merged = { ...defaultSettings, ...settings };
        fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2));
        return merged;
    } catch (err) {
        throw new Error('Failed to save settings');
    }
}

// GET /api/settings
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const settings = loadSettings();
        res.json({ settings });
    } catch (err) {
        next(err);
    }
});

// PUT /api/settings
router.put('/', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { platform_name, max_requests_per_min, jwt_expiry, ai_model_groq, ai_model_gemini, maintenance_mode, registration_open } = req.body;

        const settings = {
            platform_name: typeof platform_name === 'string' ? platform_name : defaultSettings.platform_name,
            max_requests_per_min: Number.isInteger(max_requests_per_min) ? max_requests_per_min : parseInt(max_requests_per_min, 10) || defaultSettings.max_requests_per_min,
            jwt_expiry: typeof jwt_expiry === 'string' ? jwt_expiry : defaultSettings.jwt_expiry,
            ai_model_groq: typeof ai_model_groq === 'string' ? ai_model_groq : defaultSettings.ai_model_groq,
            ai_model_gemini: typeof ai_model_gemini === 'string' ? ai_model_gemini : defaultSettings.ai_model_gemini,
            maintenance_mode: typeof maintenance_mode === 'boolean' ? maintenance_mode : defaultSettings.maintenance_mode,
            registration_open: typeof registration_open === 'boolean' ? registration_open : defaultSettings.registration_open,
        };

        const saved = saveSettings(settings);
        res.json({ message: 'Settings saved successfully', settings: saved });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
