import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const { login } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    useEffect(() => {
        setTimeout(() => setIsVisible(true), 100);
    }, []);

    const handleLogin = async (selectedRole) => {
        if (!email || !password) return toast.error('Please fill in all fields');
        setLoading(true);
        try {
            const user = await login(email, password, selectedRole);
            if (user.role === 'student') navigate('/student');
            else if (user.role === 'instructor') navigate('/instructor');
            else if (user.role === 'admin') {
                toast.error('Admin users must sign in through the admin portal');
                navigate('/login');
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleKey = (e) => {
        if (e.key === 'Enter') handleLogin('student');
    };

    return (
        <div className={`min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center p-4 transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-full max-w-md relative animate-fade-in-up">
                <button onClick={toggleTheme} className="absolute right-0 top-0 mt-2 rounded-full bg-[var(--surface-2)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] transition hover:bg-[var(--surface)] hover:scale-105 transform">
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-4 group cursor-pointer">
                        <span className="text-3xl group-hover:scale-110 transition-transform duration-300">🎓</span>
                        <span className="text-2xl font-bold text-[var(--text)] group-hover:text-purple-400 transition-colors duration-300">EduVerse</span>
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--text)] animate-gradient-text">Welcome Back</h1>
                    <p className="text-[var(--muted)] mt-1">Sign in to continue your learning journey</p>
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 space-y-5 shadow-xl shadow-black/10 hover:border-purple-500/30 transition-colors duration-300">
                    <div>
                        <label className="block text-sm font-medium text-[var(--muted)] mb-2">Email Address</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">✉</span>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                onKeyDown={handleKey}
                                placeholder="you@example.com" required
                                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-3 text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-purple-500 focus:shadow-lg focus:shadow-purple-500/20 transition-all duration-300" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--muted)] mb-2">Password</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">🔒</span>
                            <input type={showPw ? 'text' : 'password'} value={password}
                                onChange={e => setPassword(e.target.value)} onKeyDown={handleKey}
                                placeholder="••••••••" required
                                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-3 text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-purple-500 focus:shadow-lg focus:shadow-purple-500/20 transition-all duration-300" />
                        </div>
                        <div className="mt-2 flex items-center">
                            <input
                                type="checkbox"
                                id="showPassword"
                                checked={showPw}
                                onChange={(e) => setShowPw(e.target.checked)}
                                className="w-4 h-4 text-purple-500 bg-[var(--surface-2)] border-[var(--border)] rounded focus:ring-purple-500 focus:ring-2"
                            />
                            <label htmlFor="showPassword" className="ml-2 text-sm text-[var(--muted)] cursor-pointer hover:text-purple-400 transition-colors duration-300">
                                Show Password
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => handleLogin('student')} disabled={loading}
                            className="py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/50 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 text-sm">
                            {loading ? '...' : '🎓 Student Sign In'}
                        </button>
                        <button onClick={() => handleLogin('instructor')} disabled={loading}
                            className="py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-400 hover:opacity-90 hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/50 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 text-sm">
                            {loading ? '...' : ' Instructor Sign In'}
                        </button>
                    </div>

                    <p className="text-center text-sm text-[var(--muted)]">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-pink-400 hover:text-pink-300 hover:underline transition-all duration-300 font-medium">Sign up</Link>
                    </p>
                </div>

                {/* <p className="text-center text-xs text-gray-600 mt-4">
                    Demo: student@eduverse.com / Student@123
                </p> */}
            </div>
        </div>
    );
}
