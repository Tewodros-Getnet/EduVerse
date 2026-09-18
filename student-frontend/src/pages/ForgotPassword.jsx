import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [devResetUrl, setDevResetUrl] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email) {
            toast.error('Please enter your email address');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/forgot-password', { email });
            setSubmitted(true);
            
            // In development mode, show the reset link
            if (response.data.dev_reset_url) {
                setDevResetUrl(response.data.dev_reset_url);
                toast.success('Dev mode: Check the link below!');
            } else {
                toast.success('Check your email for reset instructions');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
            <div className="w-full max-w-md">
                <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-8 shadow-xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--accent-primary)]/20 rounded-full mb-4">
                            <span className="text-3xl">🔐</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Forgot Password?</h1>
                        <p className="text-sm text-[var(--muted)]">
                            No worries! Enter your email and we'll send you reset instructions.
                        </p>
                    </div>

                    {!submitted ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="w-full bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-purple-500 transition"
                                    disabled={loading}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] rounded-xl text-[var(--text)] font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </button>

                            <div className="text-center">
                                <Link
                                    to="/login"
                                    className="text-sm text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition"
                                >
                                    ← Back to Login
                                </Link>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">✓</span>
                                    <div>
                                        <h3 className="text-green-400 font-semibold mb-1">Check Your Email</h3>
                                        <p className="text-sm text-[var(--muted)]">
                                            If an account exists with <strong className="text-[var(--text)]">{email}</strong>, you'll receive password reset instructions shortly.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Dev mode reset URL */}
                            {devResetUrl && (
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                                    <div className="mb-2">
                                        <span className="text-xs text-yellow-400 font-semibold uppercase">Development Mode</span>
                                    </div>
                                    <p className="text-xs text-[var(--muted)] mb-2">
                                        Email service not configured. Use this link to reset:
                                    </p>
                                    <a
                                        href={devResetUrl}
                                        className="text-xs text-blue-400 hover:text-blue-300 break-all"
                                    >
                                        {devResetUrl}
                                    </a>
                                </div>
                            )}

                            <div className="space-y-3 text-sm text-[var(--muted)]">
                                <p>• Check your spam folder if you don't see the email</p>
                                <p>• The reset link expires in 1 hour</p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => setSubmitted(false)}
                                    className="w-full py-2.5 bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl text-[var(--text)] hover:border-purple-500 transition text-sm"
                                >
                                    Try Another Email
                                </button>
                                <Link
                                    to="/login"
                                    className="w-full py-2.5 text-center bg-transparent text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition text-sm"
                                >
                                    Back to Login
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Help Text */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-[var(--muted)]">
                        Need help?{' '}
                        <a href="mailto:support@eduverse.com" className="text-[var(--accent-primary)] hover:underline">
                            Contact Support
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
