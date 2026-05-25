import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            toast.error(err.response?.data?.error || err.message || 'Login failed');
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center p-4">
            <div className="w-full max-w-md relative">
                <button onClick={toggleTheme} className="absolute right-0 top-0 mt-2 rounded-full bg-[var(--surface-2)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] transition hover:bg-[var(--surface)]">
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">E</div>
                        <span className="text-2xl font-bold text-[var(--text)]">EduVerse</span>
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--text)] mt-4">Admin Panel</h1>
                    <p className="text-[var(--muted)] mt-1">Sign in to manage the platform</p>
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-xl shadow-black/10">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-[var(--muted)] mb-2">Email Address</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">✉</span>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder="admin@eduverse.com" required
                                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-3 text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-purple-500 transition" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--muted)] mb-2">Password</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">🔒</span>
                                <input type={showPw ? 'text' : 'password'} value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••" required
                                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl pl-10 pr-12 py-3 text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-purple-500 transition" />
                                <button type="button" onClick={() => setShowPw(!showPw)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] transition text-sm">
                                    {showPw ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-400 hover:opacity-90 transition disabled:opacity-50">
                            {loading ? 'Signing in...' : 'Sign In as Admin'}
                        </button>
                    </form>
                    <p className="text-center text-xs text-[var(--muted)] mt-4">
                        admin@eduverse.com / Admin@123
                    </p>
                </div>
            </div>
        </div>
    );
}
