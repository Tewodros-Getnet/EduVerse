import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        setTimeout(() => setIsVisible(true), 100);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
        setLoading(true);
        try {
            const user = await register(form.name, form.email, form.password, form.role);
            navigate(user.role === 'student' ? '/student' : '/instructor');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Registration failed');
        } finally { setLoading(false); }
    };

    return (
        <div className={`min-h-screen bg-gradient-to-br from-[#0d0d1a] via-[#1a0533] to-[#0d0d1a] flex items-center justify-center p-4 transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-full max-w-md animate-fade-in-up">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-4 group cursor-pointer">
                        <span className="text-3xl group-hover:scale-110 transition-transform duration-300">🎓</span>
                        <span className="text-2xl font-bold text-white group-hover:text-purple-300 transition-colors duration-300">EduVerse</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white animate-gradient-text">Create Account</h1>
                    <p className="text-gray-400 mt-1">Start your learning journey today</p>
                </div>

                <div className="bg-[#12122a]/80 border border-purple-900/40 rounded-2xl p-8 hover:border-purple-500/50 transition-colors duration-300">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="Your full name" required
                                className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:shadow-lg focus:shadow-purple-500/20 transition-all duration-300" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email Address</label>
                            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                placeholder="you@example.com" required
                                className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:shadow-lg focus:shadow-purple-500/20 transition-all duration-300" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                            <div className="relative">
                                <input type={showPw ? 'text' : 'password'} value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    placeholder="Min. 6 characters" required minLength={6}
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:shadow-lg focus:shadow-purple-500/20 transition-all duration-300" />
                                <button type="button" onClick={() => setShowPw(!showPw)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white hover:scale-110 transition-all duration-300 text-sm">
                                    {showPw ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">I am a</label>
                            <div className="grid grid-cols-2 gap-3">
                                {['student', 'instructor'].map(role => (
                                    <button key={role} type="button" onClick={() => setForm(f => ({ ...f, role }))}
                                        className={`py-3 rounded-xl font-medium text-sm capitalize transition-all duration-300 ${form.role === role ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white scale-105 shadow-lg shadow-purple-500/30' : 'bg-[#1a1a35] text-gray-400 border border-purple-900/40 hover:border-purple-500 hover:scale-105'}`}>
                                        {role === 'student' ? '🎓 Student' : '👨‍🏫 Instructor'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/50 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 mt-2">
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                        <p className="text-center text-sm text-gray-400">
                            Already have an account?{' '}
                            <Link to="/login" className="text-pink-400 hover:text-pink-300 hover:underline transition-all duration-300 font-medium">Sign in</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
