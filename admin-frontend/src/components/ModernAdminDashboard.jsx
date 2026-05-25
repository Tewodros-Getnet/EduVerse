import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ModernAdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [dashData, setDashData] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [usersRes, analyticsRes, securityRes] = await Promise.all([
                api.get('/users?limit=5'),
                api.get('/analytics/admin/dashboard'),
                api.get('/security/recent-activity?limit=5'),
            ]);

            setDashData({
                users: usersRes.data.users || [],
                analytics: analyticsRes.data || {},
                recentActivity: securityRes.data.activities || [],
            });
        } catch (error) {
            toast.error('Failed to load dashboard');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    const totalUsers = dashData?.analytics?.total_users || 0;
    const totalCourses = dashData?.analytics?.total_courses || 0;
    const activeStudents = dashData?.analytics?.active_students || 0;
    const systemHealth = dashData?.analytics?.system_health || 95;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 space-y-8">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-3xl shadow-lg p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500 opacity-10 rounded-full -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500 opacity-10 rounded-full -ml-16 -mb-16"></div>
                <div className="relative z-10">
                    <h1 className="text-4xl font-bold mb-2">System Control Center 🛡️</h1>
                    <p className="text-slate-300 text-lg">Monitor, manage, and secure your learning platform</p>
                </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <AdminMetricCard
                    icon="👥"
                    label="Total Users"
                    value={totalUsers.toLocaleString()}
                    color="from-blue-500 to-cyan-400"
                    trend="+152 this month"
                    subtitle="Students & Instructors"
                />
                <AdminMetricCard
                    icon="📚"
                    label="Active Courses"
                    value={totalCourses}
                    color="from-purple-500 to-pink-500"
                    trend="+8 this month"
                    subtitle="Being taught"
                />
                <AdminMetricCard
                    icon="🟢"
                    label="Online Now"
                    value={activeStudents}
                    color="from-emerald-500 to-teal-500"
                    trend="Peak: 2,450"
                    subtitle="Live sessions active"
                />
                <AdminMetricCard
                    icon="⚙️"
                    label="System Health"
                    value={`${systemHealth}%`}
                    color="from-orange-500 to-rose-500"
                    trend="All systems normal"
                    subtitle="Uptime: 99.9%"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Control & Management */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <AdminActionCard
                            icon="👤"
                            title="Add User"
                            description="Create new account"
                            color="from-blue-600 to-cyan-600"
                            to="/admin/users/new"
                        />
                        <AdminActionCard
                            icon="🔐"
                            title="Security"
                            description="View audit logs"
                            color="from-red-600 to-pink-600"
                            to="/admin/security"
                        />
                        <AdminActionCard
                            icon="📊"
                            title="Analytics"
                            description="Platform metrics"
                            color="from-emerald-600 to-teal-600"
                            to="/admin/analytics"
                        />
                        <AdminActionCard
                            icon="📢"
                            title="Broadcast"
                            description="Send announcements"
                            color="from-indigo-600 to-purple-600"
                            to="/admin/notifications"
                        />
                        <AdminActionCard
                            icon="⚙️"
                            title="Settings"
                            description="System config"
                            color="from-gray-600 to-slate-600"
                            to="/admin/settings"
                        />
                        <AdminActionCard
                            icon="🤖"
                            title="AI Manager"
                            description="Control AI features"
                            color="from-amber-600 to-orange-600"
                            to="/admin/ai-manager"
                        />
                    </div>

                    {/* System Alerts */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">🚨 System Alerts</h2>
                        <div className="space-y-3">
                            <AlertCard
                                type="warning"
                                title="High Memory Usage"
                                message="Server memory at 78%. Consider scaling resources."
                                action="View Resources"
                            />
                            <AlertCard
                                type="info"
                                title="Database Maintenance Scheduled"
                                message="Scheduled for tonight at 2:00 AM. Expect brief downtime."
                                action="Reschedule"
                            />
                            <AlertCard
                                type="success"
                                title="Security Audit Passed"
                                message="Latest penetration test completed successfully."
                                action="View Report"
                            />
                        </div>
                    </div>

                    {/* Recent Users */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">👥 Recent Users</h2>
                            <Link to="/admin/users" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 text-sm font-medium">
                                View All →
                            </Link>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">User</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Role</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                        {dashData?.users && dashData.users.map((user, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                                            {user.name?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                        user.role === 'admin' 
                                                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                                            : user.role === 'instructor'
                                                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                    }`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`flex items-center gap-2 text-sm font-medium ${
                                                        user.is_active 
                                                            ? 'text-emerald-600 dark:text-emerald-400' 
                                                            : 'text-gray-600 dark:text-gray-400'
                                                    }`}>
                                                        <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-600' : 'bg-gray-600'}`}></div>
                                                        {user.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Sidebar Stats & Actions */}
                <div className="space-y-6">
                    {/* System Status */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-6">⚙️ System Status</h3>

                        <div className="space-y-4">
                            <StatusItem
                                label="API Server"
                                status="Online"
                                statusType="success"
                            />
                            <StatusItem
                                label="Database"
                                status="Online"
                                statusType="success"
                            />
                            <StatusItem
                                label="Cache Server"
                                status="Online"
                                statusType="success"
                            />
                            <StatusItem
                                label="File Storage"
                                status="Online"
                                statusType="success"
                            />
                            <StatusItem
                                label="Email Service"
                                status="Degraded"
                                statusType="warning"
                            />
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-6">📊 Quick Stats</h3>

                        <div className="space-y-4">
                            <StatRow label="Active Sessions" value="1,248" icon="🟢" />
                            <StatRow label="Failed Logins (24h)" value="23" icon="⚠️" />
                            <StatRow label="API Calls (24h)" value="2.5M" icon="📡" />
                            <StatRow label="Storage Used" value="45.2 GB" icon="💾" />
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">🕐 Recent Activity</h3>
                        <div className="space-y-3">
                            {dashData?.recentActivity && dashData.recentActivity.map((activity, idx) => (
                                <div key={idx} className="flex items-start gap-3 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0"></div>
                                    <div className="min-w-0">
                                        <p className="text-gray-900 dark:text-white font-medium">{activity.action}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{activity.timestamp}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl p-6">
                        <h3 className="font-bold mb-4">📚 Documentation</h3>
                        <div className="space-y-2">
                            <QuickLink text="Admin Guide" />
                            <QuickLink text="API Docs" />
                            <QuickLink text="Troubleshooting" />
                            <QuickLink text="Support" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AdminMetricCard({ icon, label, value, color, trend, subtitle }) {
    return (
        <div className={`bg-gradient-to-br ${color} rounded-2xl shadow-lg p-6 text-white`}>
            <div className="text-4xl mb-3">{icon}</div>
            <p className="text-white/80 text-xs font-medium uppercase">{label}</p>
            <p className="text-3xl font-bold my-2">{value}</p>
            <p className="text-xs text-white/70">{trend}</p>
            <p className="text-xs text-white/60 mt-2">{subtitle}</p>
        </div>
    );
}

function AdminActionCard({ icon, title, description, color, to }) {
    return (
        <Link
            to={to}
            className={`bg-gradient-to-br ${color} text-white rounded-2xl p-4 hover:shadow-lg hover:scale-105 transition-all group flex flex-col items-center text-center`}
        >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{icon}</div>
            <h3 className="font-bold text-sm">{title}</h3>
            <p className="text-xs text-white/80">{description}</p>
        </Link>
    );
}

function AlertCard({ type, title, message, action }) {
    const colors = {
        success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
        warning: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
        error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    };

    const icons = {
        success: '✅',
        warning: '⚠️',
        error: '❌',
        info: 'ℹ️',
    };

    return (
        <div className={`border rounded-2xl p-4 flex items-start justify-between ${colors[type]}`}>
            <div className="flex items-start gap-4">
                <span className="text-2xl flex-shrink-0">{icons[type]}</span>
                <div>
                    <p className="font-bold text-gray-900 dark:text-white">{title}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{message}</p>
                </div>
            </div>
            <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium text-sm flex-shrink-0">
                {action}
            </button>
        </div>
    );
}

function StatusItem({ label, status, statusType }) {
    const colors = {
        success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
        warning: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
        error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    };

    return (
        <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300 font-medium">{label}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors[statusType]}`}>
                {status}
            </span>
        </div>
    );
}

function StatRow({ label, value, icon }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className="text-lg">{icon}</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">{value}</span>
        </div>
    );
}

function QuickLink({ text }) {
    return (
        <button className="w-full text-left px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm font-medium">
            {text} →
        </button>
    );
}
