import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, Users, BookOpen, BarChart3, Shield, Brain, ClipboardList, Settings, LogOut, Menu, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AdminNotificationButton from './AdminNotificationButton';

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
    const [sidebarOpen, setSidebarOpen] = useState(false); // Closed by default on mobile
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (!mobile) {
                setSidebarOpen(true); // Always open on desktop
            } else {
                setSidebarOpen(false); // Closed by default on mobile
            }
        };

        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogout = () => { logout(); navigate('/login'); };

    const closeSidebarOnMobile = () => {
        if (isMobile) {
            setSidebarOpen(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex relative">
            {/* Mobile Overlay */}
            {isMobile && sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                ${sidebarOpen && !isMobile ? 'w-64' : isMobile && sidebarOpen ? 'w-64' : 'lg:w-16'}
                fixed lg:relative inset-y-0 left-0 z-50
                bg-[var(--surface)] border-r border-[var(--border)] 
                flex flex-col transition-all duration-300
            `}>
                <div className="p-4 flex items-center gap-3 border-b border-[var(--border)]">
                    <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-lg flex items-center justify-center text-[var(--text)] font-bold flex-shrink-0">E</div>
                    {(sidebarOpen || !isMobile) && <span className="font-bold text-[var(--text)] text-lg">EduVerse</span>}
                </div>
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            onClick={closeSidebarOnMobile}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-sm font-medium ${
                                    isActive
                                        ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30'
                                        : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
                                }`
                            }
                        >
                            <item.Icon className="w-5 h-5 flex-shrink-0" />
                            {(sidebarOpen || !isMobile) && <span>{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>
                <div className="p-3 border-t border-[var(--border)]">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--muted)] hover:text-red-400 hover:bg-red-900/20 transition w-full text-sm">
                        <LogOut className="w-5 h-5" />
                        {(sidebarOpen || !isMobile) && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0 w-full lg:w-auto">
                {/* Topbar */}
                <header className="bg-[var(--surface)] border-b border-[var(--border)] px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-3 lg:gap-4">
                        <button 
                            onClick={() => setSidebarOpen(!sidebarOpen)} 
                            className="text-[var(--muted)] hover:text-[var(--text)] transition p-1" 
                            aria-label="Toggle sidebar"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <span className="font-semibold text-[var(--text)] text-sm lg:text-base">Admin Panel</span>
                    </div>
                    <div className="flex items-center gap-2 lg:gap-3">
                        <AdminNotificationButton />
                        <button 
                            onClick={toggleTheme} 
                            className="p-2 rounded-xl bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface)] transition flex items-center gap-1.5" 
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                        <div className="hidden sm:flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full flex items-center justify-center text-[var(--text)] text-sm font-bold">
                                {user?.name?.[0]?.toUpperCase() || 'A'}
                            </div>
                            <span className="text-sm text-[var(--muted)] hidden md:block">{user?.name || 'Admin'}</span>
                        </div>
                        {/* Mobile user avatar only */}
                        <div className="sm:hidden w-8 h-8 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full flex items-center justify-center text-[var(--text)] text-sm font-bold">
                            {user?.name?.[0]?.toUpperCase() || 'A'}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 lg:p-6 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}


