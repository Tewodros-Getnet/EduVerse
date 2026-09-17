import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';

// Validation constraints
const VALIDATION_RULES = {
    platform_name: {
        minLength: 1,
        maxLength: 100,
        required: true,
        message: 'Platform name must be 1-100 characters'
    },
    max_requests_per_min: {
        minValue: 1,
        maxValue: 10000,
        required: true,
        message: 'Rate limit must be between 1 and 10000 requests per minute'
    },
    ai_model_groq: {
        minLength: 1,
        maxLength: 100,
        required: true,
        pattern: /^[a-zA-Z0-9\-_.]+$/,
        message: 'Groq model name contains invalid characters'
    },
    ai_model_gemini: {
        minLength: 1,
        maxLength: 100,
        required: true,
        pattern: /^[a-zA-Z0-9\-_.]+$/,
        message: 'Gemini model name contains invalid characters'
    }
};

// Validation function
const validateField = (field, value) => {
    const rules = VALIDATION_RULES[field];
    if (!rules) return null;

    if (rules.required && (!value || value.toString().trim() === '')) {
        return `${field.replace(/_/g, ' ')} is required`;
    }

    if (rules.minLength && value.toString().length < rules.minLength) {
        return `Minimum length is ${rules.minLength} characters`;
    }

    if (rules.maxLength && value.toString().length > rules.maxLength) {
        return `Maximum length is ${rules.maxLength} characters`;
    }

    if (rules.minValue !== undefined && Number(value) < rules.minValue) {
        return `Minimum value is ${rules.minValue}`;
    }

    if (rules.maxValue !== undefined && Number(value) > rules.maxValue) {
        return `Maximum value is ${rules.maxValue}`;
    }

    if (rules.pattern && !rules.pattern.test(value.toString())) {
        return rules.message;
    }

    return null;
};

const validateAllFields = (settingsObj) => {
    const errors = {};
    for (const [field, value] of Object.entries(settingsObj)) {
        if (VALIDATION_RULES[field]) {
            const error = validateField(field, value);
            if (error) errors[field] = error;
        }
    }
    return errors;
};

export default function Settings() {
    const [settings, setSettings] = useState({
        platform_name: 'EduVerse',
        max_requests_per_min: 100,
        jwt_expiry: '1h',
        ai_model_groq: 'llama-3.1-8b-instant',
        ai_model_gemini: 'gemini-2.0-flash-lite',
        maintenance_mode: false,
        registration_open: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [initialSettings, setInitialSettings] = useState(settings);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await api.get('/settings');
                setSettings(response.data.settings);
                setInitialSettings(response.data.settings);
                setIsDirty(false);
                setErrors({});
            } catch (error) {
                toast.error('Failed to load settings');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    // Warn before leaving if unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const handleFieldChange = (field, value) => {
        const newSettings = { ...settings, [field]: value };
        setSettings(newSettings);
        
        // Check if dirty
        setIsDirty(JSON.stringify(newSettings) !== JSON.stringify(initialSettings));
        
        // Validate field
        const error = validateField(field, value);
        setErrors(prev => {
            const newErrors = { ...prev };
            if (error) {
                newErrors[field] = error;
            } else {
                delete newErrors[field];
            }
            return newErrors;
        });
    };

    const handleSave = async () => {
        // Validate all fields before saving
        const validationErrors = validateAllFields(settings);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error('Please fix validation errors before saving');
            return;
        }

        setSaving(true);
        try {
            await api.put('/settings', {
                ...settings,
                max_requests_per_min: parseInt(settings.max_requests_per_min) || 100,
            });
            toast.success('Settings saved successfully');
            setInitialSettings(settings);
            setIsDirty(false);
            setErrors({});
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Failed to save settings';
            toast.error(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (isDirty) {
            if (window.confirm('Discard unsaved changes?')) {
                setSettings(initialSettings);
                setIsDirty(false);
                setErrors({});
                toast.success('Changes discarded');
            }
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold text-[var(--text)]">System Settings</h1>
                <p className="text-[var(--muted)] text-sm mt-1">Configure platform-wide settings</p>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
                <h2 className="text-base font-semibold text-[var(--text)] border-b border-[var(--border)] pb-3">General</h2>
                <div>
                    <label htmlFor="platform_name" className="block text-sm text-[var(--muted)] mb-1">
                        Platform Name
                        {errors.platform_name && <span className="text-[var(--status-error)]"> *</span>}
                    </label>
                    <input 
                        id="platform_name"
                        value={settings.platform_name} 
                        onChange={e => handleFieldChange('platform_name', e.target.value)}
                        className={`w-full bg-[var(--surface-2)] border ${errors.platform_name ? 'border-[var(--status-error)]' : 'border-[var(--border)]'} rounded-xl px-4 py-2.5 text-[var(--text)] focus:outline-none focus:border-[var(--accent-primary)] text-sm`}
                        placeholder="Enter platform name"
                        maxLength="100"
                    />
                    {errors.platform_name && (
                        <p className="text-xs text-[var(--status-error)] mt-1">{errors.platform_name}</p>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-[var(--text)]">Maintenance Mode</p>
                        <p className="text-xs text-[var(--muted)]">Disable access for non-admins</p>
                    </div>
                    <button 
                        onClick={() => {
                            if (!settings.maintenance_mode) {
                                if (window.confirm('Enable maintenance mode? Non-admin users will be locked out.')) {
                                    handleFieldChange('maintenance_mode', true);
                                }
                            } else {
                                handleFieldChange('maintenance_mode', false);
                            }
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]`}
                        style={{
                            backgroundColor: settings.maintenance_mode ? 'var(--status-warning)' : 'var(--muted)'
                        }}
                        aria-label={`Maintenance mode ${settings.maintenance_mode ? 'enabled' : 'disabled'}`}
                    >
                        <span 
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform`}
                            style={{
                                transform: settings.maintenance_mode ? 'translateX(28px)' : 'translateX(4px)'
                            }}
                        />
                    </button>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-[var(--text)]">Open Registration</p>
                        <p className="text-xs text-[var(--muted)]">Allow new users to register</p>
                    </div>
                    <button 
                        onClick={() => handleFieldChange('registration_open', !settings.registration_open)}
                        className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]`}
                        style={{
                            backgroundColor: settings.registration_open ? 'var(--status-success)' : 'var(--muted)'
                        }}
                        aria-label={`Registration ${settings.registration_open ? 'open' : 'closed'}`}
                    >
                        <span 
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform`}
                            style={{
                                transform: settings.registration_open ? 'translateX(28px)' : 'translateX(4px)'
                            }}
                        />
                    </button>
                </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
                <h2 className="text-base font-semibold text-[var(--text)] border-b border-[var(--border)] pb-3">Security</h2>
                <div>
                    <label htmlFor="max_requests_per_min" className="block text-sm text-[var(--muted)] mb-1">
                        Rate Limit (requests/min/user)
                        {errors.max_requests_per_min && <span className="text-[var(--status-error)]"> *</span>}
                    </label>
                    <input 
                        id="max_requests_per_min"
                        type="number" 
                        value={settings.max_requests_per_min}
                        onChange={e => handleFieldChange('max_requests_per_min', e.target.value)}
                        className={`w-full bg-[var(--surface-2)] border ${errors.max_requests_per_min ? 'border-[var(--status-error)]' : 'border-[var(--border)]'} rounded-xl px-4 py-2.5 text-[var(--text)] focus:outline-none focus:border-[var(--accent-primary)] text-sm`}
                        min="1"
                        max="10000"
                        placeholder="Enter rate limit"
                    />
                    {errors.max_requests_per_min && (
                        <p className="text-xs text-[var(--status-error)] mt-1">{errors.max_requests_per_min}</p>
                    )}
                </div>
                <div>
                    <label className="block text-sm text-[var(--muted)] mb-1">JWT Expiry</label>
                    <select value={settings.jwt_expiry} onChange={e => setSettings(s => ({ ...s, jwt_expiry: e.target.value }))}
                        className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--text)] focus:outline-none focus:border-[var(--accent-primary)] text-sm">
                        <option value="1h">1 hour</option>
                        <option value="6h">6 hours</option>
                        <option value="24h">24 hours</option>
                    </select>
                </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
                <h2 className="text-base font-semibold text-[var(--text)] border-b border-[var(--border)] pb-3">AI Configuration</h2>
                <div>
                    <label htmlFor="ai_model_groq" className="block text-sm text-[var(--muted)] mb-1">
                        Groq Model
                        {errors.ai_model_groq && <span className="text-[var(--status-error)]"> *</span>}
                    </label>
                    <input 
                        id="ai_model_groq"
                        value={settings.ai_model_groq} 
                        onChange={e => handleFieldChange('ai_model_groq', e.target.value)}
                        className={`w-full bg-[var(--surface-2)] border ${errors.ai_model_groq ? 'border-[var(--status-error)]' : 'border-[var(--border)]'} rounded-xl px-4 py-2.5 text-[var(--text)] focus:outline-none focus:border-[var(--accent-primary)] text-sm`}
                        placeholder="e.g., llama-3.1-8b-instant"
                        maxLength="100"
                    />
                    {errors.ai_model_groq && (
                        <p className="text-xs text-[var(--status-error)] mt-1">{errors.ai_model_groq}</p>
                    )}
                </div>
                <div>
                    <label htmlFor="ai_model_gemini" className="block text-sm text-[var(--muted)] mb-1">
                        Gemini Model
                        {errors.ai_model_gemini && <span className="text-[var(--status-error)]"> *</span>}
                    </label>
                    <input 
                        id="ai_model_gemini"
                        value={settings.ai_model_gemini} 
                        onChange={e => handleFieldChange('ai_model_gemini', e.target.value)}
                        className={`w-full bg-[var(--surface-2)] border ${errors.ai_model_gemini ? 'border-[var(--status-error)]' : 'border-[var(--border)]'} rounded-xl px-4 py-2.5 text-[var(--text)] focus:outline-none focus:border-[var(--accent-primary)] text-sm`}
                        placeholder="e.g., gemini-2.0-flash-lite"
                        maxLength="100"
                    />
                    {errors.ai_model_gemini && (
                        <p className="text-xs text-[var(--status-error)] mt-1">{errors.ai_model_gemini}</p>
                    )}
                </div>
            </div>

            <div className="flex gap-3">
                <button 
                    onClick={handleSave}
                    disabled={loading || saving || Object.keys(errors).length > 0 || !isDirty}
                    className="px-6 py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-xl text-[var(--text)] font-semibold hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-60"
                    title={!isDirty ? 'No changes to save' : Object.keys(errors).length > 0 ? 'Fix errors before saving' : ''}
                >
                    {saving ? 'Saving…' : 'Save Settings'}
                </button>
                <button 
                    onClick={handleReset}
                    disabled={!isDirty}
                    className="px-6 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text)] font-semibold hover:bg-[var(--surface-3)] transition disabled:cursor-not-allowed disabled:opacity-50"
                    title="Discard unsaved changes"
                >
                    Reset
                </button>
            </div>
        </div>
    );
}




