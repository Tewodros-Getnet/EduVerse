import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const navItems = [
    { path: '/instructor', label: 'Dashboard', end: true },
    { path: '/instructor/courses', label: 'Courses' },
    { path: '/instructor/quizzes', label: 'Quizzes' },
    { path: '/instructor/live-classes', label: 'Live' },
    { path: '/instructor/assignments', label: 'Assignments' },
    { path: '/instructor/assessments', label: 'Assessments' },
    { path: '/instructor/students', label: 'Students' },
    { path: '/instructor/analytics', label: 'Analytics' },
    { path: '/instructor/ai-tools', label: 'AI Tools' },
];

export default function InstructorLayout() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const mobileNavRef = useRef(null);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (mobileNavRef.current && !mobileNavRef.current.contains(event.target)) {
                setMobileNavOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col">
            <header className="bg-[var(--surface)] border-b border-[var(--border)] px-4 md:px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                    <button onClick={() => setMobileNavOpen(prev => !prev)} className="text-gray-400 hover:text-white transition lg:hidden flex-shrink-0 text-2xl">☰</button>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xl">🎓</span>
                        <span className="font-bold text-[var(--text)] hidden sm:block">EduVerse Instructor</span>
                    </div>
                    <nav className="hidden lg:flex gap-1 flex-1 overflow-x-auto">
                        {navItems.map(item => (
                            <NavLink key={item.path} to={item.path} end={item.end}
                                className={({ isActive }) =>
                                    `px-3 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${isActive ? 'bg-purple-600/30 text-purple-300' : 'text-gray-400 hover:text-white'}`
                                }>
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>
                <div className="flex items-center gap-2 md:gap-3 relative flex-shrink-0">
                    <button onClick={toggleTheme} className="px-2 md:px-3 py-2 rounded-xl bg-[var(--surface-2)] text-xs md:text-sm text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface)] transition">
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                    <button onClick={() => setMenuOpen(!menuOpen)}
                        className="flex items-center gap-2 cursor-pointer">
                        <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-purple-500/40 flex-shrink-0">
                            {user?.avatar_url
                                ? <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                : <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">{user?.name?.[0]?.toUpperCase()}</div>
                            }
                        </div>
                        <span className="text-sm text-gray-300 hidden lg:block">{user?.name}</span>
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-52 bg-[#1a1a35] border border-purple-900/40 rounded-xl shadow-xl z-50 py-1">
                            <div className="px-4 py-2.5 border-b border-purple-900/30">
                                <p className="text-sm font-medium text-white">{user?.name}</p>
                                <p className="text-xs text-gray-400">{user?.email}</p>
                            </div>
                            <Link
                                to="/instructor/profile"
                                onClick={() => setMenuOpen(false)}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-purple-600/20 hover:text-white transition flex items-center gap-2"
                            >
                                <UserCircle className="w-4 h-4" /> My Profile
                            </Link>
                            <button onClick={handleLogout}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-purple-600/20 hover:text-white transition">
                                🚪 Logout
                            </button>
                        </div>
                    )}
                </div>
            </header>
            {mobileNavOpen && (
                <div ref={mobileNavRef} className="lg:hidden bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3">
                    <nav className="space-y-2">
                        {navItems.map(item => (
                            <NavLink key={item.path} to={item.path} end={item.end}
                                onClick={() => setMobileNavOpen(false)}
                                className={({ isActive }) =>
                                    `block px-4 py-2 rounded-xl text-sm font-medium transition ${isActive ? 'bg-purple-600/30 text-purple-300' : 'text-gray-400 hover:text-white'}`
                                }>
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>
            )}

            <main className="flex-1 p-6">
                <Outlet />
            </main>
        </div>
    );
}
