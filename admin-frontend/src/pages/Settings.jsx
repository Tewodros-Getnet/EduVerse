import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';

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

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await api.get('/settings');
                setSettings(response.data.settings);
            } catch (error) {
                toast.error('Failed to load settings');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/settings', {
                ...settings,
                max_requests_per_min: parseInt(settings.max_requests_per_min) || 100,
            });
            toast.success('Settings saved successfully');
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold text-white">System Settings</h1>
                <p className="text-gray-400 text-sm mt-1">Configure platform-wide settings</p>
            </div>

            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-6 space-y-5">
                <h2 className="text-base font-semibold text-white border-b border-purple-900/30 pb-3">General</h2>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Platform Name</label>
                    <input value={settings.platform_name} onChange={e => setSettings(s => ({ ...s, platform_name: e.target.value }))}
                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm" />
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-white">Maintenance Mode</p>
                        <p className="text-xs text-gray-500">Disable access for non-admins</p>
                    </div>
                    <button onClick={() => setSettings(s => ({ ...s, maintenance_mode: !s.maintenance_mode }))}
                        className={`w-12 h-6 rounded-full transition-colors ${settings.maintenance_mode ? 'bg-purple-500' : 'bg-gray-600'} relative`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.maintenance_mode ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-white">Open Registration</p>
                        <p className="text-xs text-gray-500">Allow new users to register</p>
                    </div>
                    <button onClick={() => setSettings(s => ({ ...s, registration_open: !s.registration_open }))}
                        className={`w-12 h-6 rounded-full transition-colors ${settings.registration_open ? 'bg-purple-500' : 'bg-gray-600'} relative`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.registration_open ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-6 space-y-5">
                <h2 className="text-base font-semibold text-white border-b border-purple-900/30 pb-3">Security</h2>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Rate Limit (requests/min/user)</label>
                    <input type="number" value={settings.max_requests_per_min}
                        onChange={e => setSettings(s => ({ ...s, max_requests_per_min: e.target.value }))}
                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm" />
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">JWT Expiry</label>
                    <select value={settings.jwt_expiry} onChange={e => setSettings(s => ({ ...s, jwt_expiry: e.target.value }))}
                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm">
                        <option value="1h">1 hour</option>
                        <option value="6h">6 hours</option>
                        <option value="24h">24 hours</option>
                    </select>
                </div>
            </div>

            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-6 space-y-5">
                <h2 className="text-base font-semibold text-white border-b border-purple-900/30 pb-3">AI Configuration</h2>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Groq Model</label>
                    <input value={settings.ai_model_groq} onChange={e => setSettings(s => ({ ...s, ai_model_groq: e.target.value }))}
                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm" />
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Gemini Model</label>
                    <input value={settings.ai_model_gemini} onChange={e => setSettings(s => ({ ...s, ai_model_gemini: e.target.value }))}
                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm" />
                </div>
            </div>

            <button onClick={handleSave}
                disabled={loading || saving}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Settings'}
            </button>
        </div>
    );
}
