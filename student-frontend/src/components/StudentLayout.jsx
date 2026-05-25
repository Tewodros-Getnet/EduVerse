import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Clapperboard, ClipboardList, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import FloatingAIAssistant from './FloatingAIAssistant';

const navItems = [
    { path: '/student', label: 'Dashboard', end: true },
    { path: '/student/courses', label: 'Courses' },
    { path: '/student/live', label: 'Live Classes' },
    { path: '/student/assignments', label: 'Assignments' },
    { path: '/student/grades', label: 'Grades' },
    { path: '/student/assessments', label: 'Assessments' },
    { path: '/student/ai-tutor', label: 'AI Tutor' },
    { path: '/student/progress', label: 'Progress' },
];

export default function StudentLayout() {
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
                        <span className="font-bold text-[var(--text)] hidden sm:block">EduVerse</span>
                    </div>
                    <nav className="hidden lg:flex gap-1 flex-1 overflow-x-auto">
                        {navItems.map(item => (
                            <NavLink key={item.path} to={item.path} end={item.end}
                                className={({ isActive }) =>
                                    `px-3 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${isActive ? 'bg-indigo-500/20 text-indigo-400 dark:text-indigo-300' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                            >
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
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {user?.name?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-300 hidden lg:block">{user?.name}</span>
                        <span className="text-gray-400 text-xs hidden lg:block">▾</span>
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 top-12 bg-[#1a1a35] border border-purple-900/40 rounded-xl shadow-xl z-50 min-w-[160px] py-1">
                            <div className="px-4 py-2 border-b border-purple-900/30">
                                <p className="text-sm font-medium text-white">{user?.name}</p>
                                <p className="text-xs text-gray-400">{user?.email}</p>
                            </div>
                            <button onClick={handleLogout}
                                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/20 transition flex items-center gap-2">
                                🚪 Logout
                            </button>
                        </div>
                    )}
                </div>
            </header >
            {mobileNavOpen && (
                <div ref={mobileNavRef} className="lg:hidden bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3">
                    <nav className="space-y-2">
                        {navItems.map(item => (
                            <NavLink key={item.path} to={item.path} end={item.end}
                                onClick={() => setMobileNavOpen(false)}
                                className={({ isActive }) =>
                                    `block px-4 py-2 rounded-xl text-sm font-medium transition ${isActive ? 'bg-indigo-500/20 text-indigo-400' : 'text-[var(--muted)] hover:text-[var(--text)]'}`
                                }>
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>
            )
            }
            {
                menuOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                )
            }
            <main className="flex-1 p-4 md:p-6 overflow-auto pb-24 md:pb-6">
                <Outlet />
            </main>

            <FloatingAIAssistant />

            <nav
                className="fixed bottom-0 inset-x-0 z-20 md:hidden border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-1 pt-1 pb-3"
                aria-label="Mobile primary navigation"
            >
                <div className="flex justify-around items-stretch max-w-lg mx-auto">
                    <BottomTab to="/student" end icon={LayoutDashboard} label="Home" />
                    <BottomTab to="/student/courses" icon={BookOpen} label="Courses" />
                    <BottomTab to="/student/live" icon={Clapperboard} label="Live" />
                    <BottomTab to="/student/assignments" icon={ClipboardList} label="Work" />
                    <BottomTab to="/student/ai-tutor" icon={Sparkles} label="AI" />
                </div>
            </nav>
        </div >
    );
}

function BottomTab({ to, end, icon: Icon, label }) {
    return (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl text-[10px] font-medium min-w-0 flex-1 transition ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--muted)]'
                }`
            }
        >
            <Icon className="w-5 h-5 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="truncate w-full text-center">{label}</span>
        </NavLink>
    );
}
