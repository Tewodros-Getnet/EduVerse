import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { UserCircle, Menu, LogOut, Sun, Moon, GraduationCap } from 'lucide-react';
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
                    <button onClick={() => setMobileNavOpen(prev => !prev)} className="text-[var(--muted)] hover:text-[var(--text)] transition lg:hidden flex-shrink-0">
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center">
                            <GraduationCap className="w-4 h-4 text-[var(--text)]" />
                        </div>
                        <span className="font-bold text-[var(--text)] hidden sm:block">EduVerse Instructor</span>
                    </div>
                    <nav className="hidden lg:flex gap-1 flex-1 overflow-x-auto">
                        {navItems.map(item => (
                            <NavLink key={item.path} to={item.path} end={item.end}
                                className={({ isActive }) =>
                                    `px-3 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                                        isActive
                                            ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] dark:text-[var(--accent-primary)]/80'
                                            : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                                    }`
                                }>
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>
                <div className="flex items-center gap-2 md:gap-3 relative flex-shrink-0">
                    <button onClick={toggleTheme}
                        className="p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-purple-500/40 transition"
                        title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}>
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setMenuOpen(!menuOpen)}
                        className="flex items-center gap-2 cursor-pointer">
                        <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-purple-500/40 flex-shrink-0">
                            {user?.avatar_url
                                ? <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                : <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-[var(--text)] text-sm font-bold">{user?.name?.[0]?.toUpperCase()}</div>
                            }
                        </div>
                        <span className="text-sm text-[var(--muted)] hidden lg:block">{user?.name}</span>
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-52 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 py-1">
                            <div className="px-4 py-2.5 border-b border-[var(--border)]">
                                <p className="text-sm font-medium text-[var(--text)]">{user?.name}</p>
                                <p className="text-xs text-[var(--muted)]">{user?.email}</p>
                            </div>
                            <Link
                                to="/instructor/profile"
                                onClick={() => setMenuOpen(false)}
                                className="w-full text-left px-4 py-2.5 text-sm text-[var(--muted)] hover:bg-[var(--accent-primary)]/20 hover:text-[var(--text)] transition flex items-center gap-2"
                            >
                                <UserCircle className="w-4 h-4" /> My Profile
                            </Link>
                            <button onClick={handleLogout}
                                className="w-full text-left px-4 py-2.5 text-sm text-[var(--muted)] hover:bg-[var(--accent-primary)]/20 hover:text-[var(--text)] transition flex items-center gap-2">
                                <LogOut className="w-4 h-4" /> Logout
                            </button>
                        </div>
                    )}
                </div>
            </header>
            {mobileNavOpen && (
                <div ref={mobileNavRef} className="lg:hidden bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3">
                    <nav className="space-y-1">
                        {navItems.map(item => (
                            <NavLink key={item.path} to={item.path} end={item.end}
                                onClick={() => setMobileNavOpen(false)}
                                className={({ isActive }) =>
                                    `block px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                                        isActive
                                            ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
                                            : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                                    }`
                                }>
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>
            )}

            <main className="flex-1 p-3 md:p-6 overflow-x-hidden">
                <Outlet />
            </main>
        </div>
    );
}







