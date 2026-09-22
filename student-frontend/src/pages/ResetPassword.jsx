import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        if (!token) {
            toast.error('Invalid reset link');
            navigate('/login');
        }
    }, [token, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!password || !confirmPassword) {
            toast.error('Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/reset-password', {
                token,
                newPassword: password
            });

            toast.success('Password reset successfully!');
            
            // Redirect to login after 1.5 seconds
            setTimeout(() => {
                navigate('/login');
            }, 1500);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    if (!token) return null;

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
            <div className="w-full max-w-md">
                <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-8 shadow-xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--accent-primary)]/20 rounded-full mb-4">
                            <span className="text-3xl">🔑</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Reset Password</h1>
                        <p className="text-sm text-[var(--muted)]">
                            Enter your new password below
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text)] mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-purple-500 transition pr-12"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] transition"
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                            <p className="text-xs text-[var(--muted)] mt-1">
                                Must be at least 6 characters
                            </p>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text)] mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    className="w-full bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-purple-500 transition pr-12"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] transition"
                                >
                                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

                        {/* Password Match Indicator */}
                        {password && confirmPassword && (
                            <div className={`text-xs p-2 rounded-lg ${
                                password === confirmPassword
                                    ? 'bg-green-500/10 text-green-400'
                                    : 'bg-red-500/10 text-red-400'
                            }`}>
                                {password === confirmPassword ? '✓ Passwords match' : 'x Passwords do not match'}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !password || !confirmPassword || password !== confirmPassword}
                            className="w-full py-3 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] rounded-xl text-[var(--text)] font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
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
                </div>

                {/* Security Note */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-[var(--muted)]">
                        🔒 Your password is encrypted and secure
                    </p>
                </div>
            </div>
        </div>
    );
}
