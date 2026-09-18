import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, Users, BookOpen, BarChart3, Shield, Brain, ClipboardList, Settings, LogOut, Menu, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const navItems = [
    { path: '/', label: 'Dashboard', Icon: LayoutGrid },
    { path: '/users', label: 'Users', Icon: Users },
    { path: '/courses', label: 'Courses', Icon: BookOpen },
    { path: '/analytics', label: 'Analytics', Icon: BarChart3 },
    { path: '/security', label: 'Security', Icon: Shield },
    { path: '/ai', label: 'AI', Icon: Brain },
    { path: '/audit-logs', label: 'Audit logs', Icon: ClipboardList },
    { path: '/settings', label: 'Settings', Icon: Settings },
];

export default function Layout() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex">
            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-[var(--surface)] border-r border-[var(--border)] flex flex-col transition-all duration-300`}>
                <div className="p-4 flex items-center gap-3 border-b border-[var(--border)]">
                    <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-lg flex items-center justify-center text-[var(--text)] font-bold flex-shrink-0">E</div>
                    {sidebarOpen && <span className="font-bold text-[var(--text)] text-lg">EduVerse</span>}
                </div>
                <nav className="flex-1 p-3 space-y-1">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-sm font-medium ${
                                    isActive
                                        ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30'
                                        : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
                                }`
                            }
                        >
                            <item.Icon className="w-5 h-5 flex-shrink-0" />
                            {sidebarOpen && <span>{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>
                <div className="p-3 border-t border-[var(--border)]">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--muted)] hover:text-red-400 hover:bg-red-900/20 transition w-full text-sm">
                        <LogOut className="w-5 h-5" />
                        {sidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Topbar */}
                <header className="bg-[var(--surface)] border-b border-[var(--border)] px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-[var(--muted)] hover:text-[var(--text)] transition" aria-label="Toggle sidebar">
                            <Menu className="w-5 h-5" />
                        </button>
                        <span className="font-semibold text-[var(--text)]">Admin Panel</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={toggleTheme} className="p-2 rounded-xl bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface)] transition flex items-center gap-1.5" aria-label="Toggle theme">
                            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full flex items-center justify-center text-[var(--text)] text-sm font-bold">
                                {user?.name?.[0]?.toUpperCase() || 'A'}
                            </div>
                            <span className="text-sm text-[var(--muted)]">{user?.name || 'Admin'}</span>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-6 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}


