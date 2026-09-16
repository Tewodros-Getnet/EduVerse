import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Bot, Video, Target, BarChart2, Rocket, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';

const features = [
    { icon: Bot, title: 'AI-Powered Tutoring', desc: 'Get instant answers from our intelligent AI tutor powered by advanced language models' },
    { icon: Video, title: 'Live Face-to-Face Classes', desc: 'Connect with instructors in real-time virtual classrooms with HD video' },
    { icon: Target, title: 'Adaptive Learning', desc: 'Personalized learning paths that adjust to your pace and performance' },
    { icon: BarChart2, title: 'Real-Time Analytics', desc: 'Track progress with detailed insights and performance metrics' },
];

export default function Landing() {
    const { theme, toggleTheme } = useTheme();
    const [stats, setStats] = useState([
        { value: '0', label: 'Active Students' },
        { value: '0', label: 'Expert Instructors' },
        { value: '0', label: 'Courses Available' },
        { value: '0%', label: 'Success Rate' },
    ]);
    const [loading, setLoading] = useState(true);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        fetchStats();
        // Trigger fade-in animation
        setTimeout(() => setIsVisible(true), 100);
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/analytics/public/stats');
            const data = response.data;
            setStats([
                { value: data.active_students?.toLocaleString() || '0', label: 'Active Students' },
                { value: data.instructors?.toLocaleString() || '0', label: 'Expert Instructors' },
                { value: data.courses?.toLocaleString() || '0', label: 'Courses Available' },
                { value: `${data.success_rate || 0}%`, label: 'Success Rate' },
            ]);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            // Keep default static values if API fails
            setStats([
                { value: '10,000+', label: 'Active Students' },
                { value: '500+', label: 'Expert Instructors' },
                { value: '1,000+', label: 'Courses Available' },
                { value: '98%', label: 'Success Rate' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen bg-gradient-to-br from-[var(--bg)] via-[var(--surface)] to-[var(--bg)] transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            {/* Navbar */}
            <nav className="flex items-center justify-between px-8 py-4 animate-fade-in-down">
                <div className="flex items-center gap-2 group cursor-pointer">
                    <GraduationCap className="w-7 h-7 text-[var(--accent-primary)] group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-xl font-bold text-[var(--text)] group-hover:text-[var(--accent-primary)]/80 transition-colors duration-300">EduVerse</span>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={toggleTheme} className="p-2 rounded-xl bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition" aria-label="Toggle theme">
                        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <Link to="/login" className="text-[var(--text)] hover:text-[var(--accent-primary)]/80 transition-all duration-300 text-sm font-medium hover:scale-105 transform">Sign In</Link>
                    <Link to="/register" className="px-5 py-2 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] rounded-full text-[var(--text)] text-sm font-semibold hover:opacity-90 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50 transform">
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* Hero */}
            <div className="text-center px-6 pt-16 pb-12 animate-fade-in-up">
                <h1 className="text-5xl md:text-6xl font-extrabold text-[var(--text)] leading-tight animate-gradient-text">
                    Transform Your Learning
                </h1>
                <h2 className="text-5xl md:text-6xl font-extrabold mt-2 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] bg-clip-text text-transparent animate-gradient-shift">
                    Experience
                </h2>
                <p className="text-[var(--muted)] mt-6 max-w-2xl mx-auto text-lg animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    Join the future of education with AI-powered tutoring, live video classes, and personalized learning paths designed for 100% growth
                </p>
                <div className="flex items-center justify-center gap-4 mt-8 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                    <Link to="/register" className="px-8 py-3 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] rounded-full text-[var(--text)] font-semibold hover:opacity-90 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-purple-500/50 transform text-lg">
                        Start Learning
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-8 py-10 border-t border-b border-white/10 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                {stats.map((s, index) => (
                    <div key={s.label} className="text-center group cursor-default">
                        <div className="text-3xl font-extrabold text-[var(--text)] group-hover:scale-110 transition-transform duration-300">{s.value}</div>
                        <div className="text-[var(--muted)] text-sm mt-1 group-hover:text-[var(--accent-primary)]/80 transition-colors duration-300">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Features */}
            <div className="px-8 py-16 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
                <h2 className="text-3xl font-bold text-[var(--text)] text-center mb-2">Advanced Learning Features</h2>
                <p className="text-[var(--muted)] text-center mb-10">Everything you need to succeed in modern education</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {features.map((f, index) => (
                        <div key={f.title} className="bg-[var(--surface-2)]/60 border border-purple-900/30 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20 transform group">
                            <div className="w-12 h-12 bg-gradient-to-br from-[var(--accent-secondary)] to-[var(--accent-primary)] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                <f.icon className="w-6 h-6 text-[var(--text)]" />
                            </div>
                            <h3 className="text-lg font-bold text-[var(--text)] mb-2 group-hover:text-[var(--accent-primary)]/80 transition-colors duration-300">{f.title}</h3>
                            <p className="text-[var(--muted)] text-sm group-hover:text-[var(--muted)] transition-colors duration-300">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <div className="mx-8 mb-16 bg-gradient-to-br from-[var(--accent-primary)]/40 to-[var(--accent-secondary)]/40 border border-[var(--accent-primary)]/30 rounded-3xl p-12 text-center animate-fade-in-up hover:scale-105 transition-transform duration-500" style={{ animationDelay: '1s' }}>
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-secondary)] to-[var(--accent-primary)] rounded-2xl flex items-center justify-center">
                        <Rocket className="w-8 h-8 text-[var(--text)]" />
                    </div>
                </div>
                <h2 className="text-3xl font-bold text-[var(--text)] mb-3">Ready to Transform Your Learning?</h2>
                <p className="text-[var(--muted)] mb-8">Join thousands of students achieving 100% growth with our AI-powered platform</p>
                <Link to="/register" className="px-8 py-3 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] rounded-full text-[var(--text)] font-semibold hover:opacity-90 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-purple-500/50 transform text-lg inline-block">
                    Get Started Now
                </Link>
            </div>

            {/* Footer */}
            <footer className="text-center py-6 text-[var(--muted)] text-sm border-t border-white/10 animate-fade-in-up" style={{ animationDelay: '1.2s' }}>
                © 2026 EduVerse. Empowering learners worldwide with AI.
            </footer>
        </div>
    );
}








