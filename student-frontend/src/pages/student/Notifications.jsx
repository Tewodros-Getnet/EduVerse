import React, { useEffect, useState } from 'react';
import { FileText, Target, BarChart2, Megaphone, Clock, Radio, BookOpen, Trash2, Bell } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // all, unread, announcements, reminders
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [notificationSettings, setNotificationSettings] = useState({
        email_notifications: true,
        push_notifications: true,
        assignment_reminders: true,
        quiz_reminders: true,
        live_session_alerts: true,
        course_updates: true,
        grade_notifications: true
    });

    useEffect(() => {
        fetchNotifications();
        fetchNotificationSettings();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications/student');
            setNotifications(res.data.notifications || []);
        } catch (error) {
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    const fetchNotificationSettings = async () => {
        try {
            const res = await api.get('/notifications/student/settings');
            setNotificationSettings(res.data.settings || notificationSettings);
        } catch (error) {
            console.error('Failed to load notification settings:', error);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await api.post(`/notifications/${notificationId}/read`);
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
            );
        } catch (error) {
            toast.error('Failed to mark notification as read');
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.post('/notifications/student/read-all');
            setNotifications(prev =>
                prev.map(n => ({ ...n, read: true }))
            );
            toast.success('All notifications marked as read');
        } catch (error) {
            toast.error('Failed to mark all as read');
        }
    };

    const deleteNotification = async (notificationId) => {
        try {
            await api.delete(`/notifications/${notificationId}`);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            toast.success('Notification deleted');
        } catch (error) {
            toast.error('Failed to delete notification');
        }
    };

    const updateNotificationSettings = async (settings) => {
        try {
            await api.post('/notifications/student/settings', settings);
            setNotificationSettings(settings);
            setShowSettings(false);
            toast.success('Notification settings updated');
        } catch (error) {
            toast.error('Failed to update notification settings');
        }
    };

    const getFilteredNotifications = () => {
        switch (activeTab) {
            case 'unread':
                return notifications.filter(n => !n.read);
            case 'announcements':
                return notifications.filter(n => n.type === 'announcement');
            case 'reminders':
                return notifications.filter(n => n.type === 'reminder');
            default:
                return notifications;
        }
    };

    const getNotificationIcon = (type) => {
        const icons = {
            assignment: FileText,
            quiz: Target,
            grade: BarChart2,
            announcement: Megaphone,
            reminder: Clock,
            live_session: Radio,
            course_update: BookOpen,
        };
        return icons[type] || Bell;
    };

    const getNotificationColor = (type, read) => {
        if (read) return 'bg-gray-500/20 border-gray-500/30';

        switch (type) {
            case 'assignment': return 'bg-blue-500/20 border-[var(--accent-tertiary)]/30';
            case 'quiz': return 'bg-green-500/20 border-green-500/30';
            case 'grade': return 'bg-[var(--accent-primary)]/20 border-[var(--accent-primary)]/30';
            case 'announcement': return 'bg-yellow-500/20 border-yellow-500/30';
            case 'reminder': return 'bg-orange-500/20 border-orange-500/30';
            case 'live_session': return 'bg-red-500/20 border-red-500/30';
            case 'course_update': return 'bg-cyan-500/20 border-cyan-500/30';
            default: return 'bg-gray-500/20 border-gray-500/30';
        }
    };

    const formatNotificationTime = (createdAt) => {
        const now = new Date();
        const created = new Date(createdAt);
        const diffMs = now - created;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return created.toLocaleDateString();
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    if (selectedNotification) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <button
                        onClick={() => setSelectedNotification(null)}
                        className="text-[var(--accent-primary)] hover:text-[var(--accent-primary)]/80 transition text-sm"
                    >
                        ← Back to notifications
                    </button>
                </div>

                <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getNotificationColor(selectedNotification.type, selectedNotification.read)}`}>
                            {React.createElement(getNotificationIcon(selectedNotification.type), { className: 'w-6 h-6 text-[var(--text)]' })}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-[var(--text)] mb-2">{selectedNotification.title}</h2>
                            <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                                <span>{formatNotificationTime(selectedNotification.created_at)}</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getNotificationColor(selectedNotification.type, selectedNotification.read)}`}>
                                    {selectedNotification.type?.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="prose prose-invert max-w-none">
                        <div
                            className="text-[var(--muted)] leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: selectedNotification.message }}
                        />
                    </div>

                    {selectedNotification.action_url && (
                        <div className="mt-6">
                            <a
                                href={selectedNotification.action_url}
                                className="inline-block px-6 py-3 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] rounded-xl text-[var(--text)] font-medium hover:opacity-90 transition"
                            >
                                {selectedNotification.action_text || 'View Details'}
                            </a>
                        </div>
                    )}

                    <div className="mt-6 pt-6 border-t border-purple-900/30 flex gap-3">
                        {!selectedNotification.read && (
                            <button
                                onClick={() => {
                                    markAsRead(selectedNotification.id);
                                    setSelectedNotification({ ...selectedNotification, read: true });
                                }}
                                className="px-4 py-2 bg-blue-600/30 border border-[var(--accent-tertiary)]/30 rounded-xl text-blue-300 text-sm hover:bg-blue-600/40 transition"
                            >
                                Mark as Read
                            </button>
                        )}
                        <button
                            onClick={() => deleteNotification(selectedNotification.id)}
                            className="px-4 py-2 bg-red-600/30 border border-red-500/30 rounded-xl text-red-300 text-sm hover:bg-red-600/40 transition"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text)]">Notifications</h1>
                    <p className="text-[var(--muted)] text-sm mt-1">
                        {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
                    </p>
                </div>
                <div className="flex gap-3">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="px-4 py-2 bg-blue-600/30 border border-[var(--accent-tertiary)]/30 rounded-xl text-blue-300 text-sm hover:bg-blue-600/40 transition"
                        >
                            Mark All Read
                        </button>
                    )}
                    <button
                        onClick={() => setShowSettings(true)}
                        className="px-4 py-2 bg-[var(--accent-primary)]/30 border border-[var(--accent-primary)]/30 rounded-xl text-[var(--accent-primary)]/80 text-sm hover:bg-[var(--accent-primary)]/40 transition"
                    >
                        Settings
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-1">
                <div className="flex gap-1">
                    {[
                        { id: 'all', label: 'All', count: notifications.length },
                        { id: 'unread', label: 'Unread', count: unreadCount },
                        { id: 'announcements', label: 'Announcements', count: notifications.filter(n => n.type === 'announcement').length },
                        { id: 'reminders', label: 'Reminders', count: notifications.filter(n => n.type === 'reminder').length }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === tab.id
                                    ? 'bg-[var(--accent-primary)] text-[var(--text)]'
                                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                                }`}
                        >
                            <span>{tab.label}</span>
                            {tab.count > 0 && (
                                <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${activeTab === tab.id ? 'bg-white text-[var(--accent-primary)]/80' : 'bg-[var(--accent-primary)] text-[var(--text)]'
                                    }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {getFilteredNotifications().length === 0 ? (
                        <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-8 text-center">
                            <div className="mb-4">
                                <div className="w-16 h-16 bg-[var(--surface-2)] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Bell className="w-6 h-6 text-[var(--muted)]" />
                                </div>
                            </div>
                            <h3 className="text-lg font-medium text-[var(--text)] mb-2">
                                {activeTab === 'unread' ? 'No unread notifications' :
                                    activeTab === 'announcements' ? 'No announcements' :
                                        activeTab === 'reminders' ? 'No reminders' :
                                            'No notifications'}
                            </h3>
                            <p className="text-sm text-[var(--muted)]">
                                {activeTab === 'unread' ? 'All notifications have been read' :
                                    activeTab === 'announcements' ? 'No new announcements at this time' :
                                        activeTab === 'reminders' ? 'No reminders scheduled' :
                                            'Your notifications will appear here'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {getFilteredNotifications().map(notification => (
                                <div
                                    key={notification.id}
                                    className={`bg-[var(--surface)] border rounded-2xl p-4 hover:border-purple-500/50 transition cursor-pointer ${notification.read ? 'border-purple-900/30 opacity-60' : 'border-[var(--accent-primary)]/30'
                                        }`}
                                    onClick={() => {
                                        if (!notification.read) markAsRead(notification.id);
                                        setSelectedNotification(notification);
                                    }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type, notification.read)}`}>
                                            {React.createElement(getNotificationIcon(notification.type), { className: 'w-5 h-5 text-[var(--text)]' })}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h3 className={`font-medium text-sm truncate ${notification.read ? 'text-[var(--muted)]' : 'text-[var(--text)]'
                                                    }`}>
                                                    {notification.title}
                                                </h3>
                                                {!notification.read && (
                                                    <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0" />
                                                )}
                                            </div>
                                            <p className={`text-sm line-clamp-2 mb-2 ${notification.read ? 'text-[var(--muted)]' : 'text-[var(--muted)]'
                                                }`}>
                                                {notification.message.replace(/<[^>]*>/g, '')}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-[var(--muted)]">
                                                    {formatNotificationTime(notification.created_at)}
                                                </span>
                                                <div className="flex gap-2">
                                                    {!notification.read && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                markAsRead(notification.id);
                                                            }}
                                                            className="p-1 hover:bg-[var(--accent-primary)]/20 rounded transition"
                                                        >
                                                            <span className="text-xs">✓</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteNotification(notification.id);
                                                        }}
                                                        className="p-1 hover:bg-red-600/20 rounded transition text-red-400 hover:text-red-300"
                                                        aria-label="Delete notification"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-[var(--text)]">Notification Settings</h3>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="text-[var(--muted)] hover:text-[var(--text)]"
                            >
                                ←
                            </button>
                        </div>

                        <div className="space-y-4">
                            {Object.entries({
                                email_notifications: 'Email Notifications',
                                push_notifications: 'Push Notifications',
                                assignment_reminders: 'Assignment Reminders',
                                quiz_reminders: 'Quiz Reminders',
                                live_session_alerts: 'Live Session Alerts',
                                course_updates: 'Course Updates',
                                grade_notifications: 'Grade Notifications'
                            }).map(([key, label]) => (
                                <label key={key} className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--muted)]">{label}</span>
                                    <input
                                        type="checkbox"
                                        checked={notificationSettings[key]}
                                        onChange={(e) => setNotificationSettings(prev => ({
                                            ...prev,
                                            [key]: e.target.checked
                                        }))}
                                        className="w-4 h-4 rounded border-[var(--border)]/40 bg-[var(--surface-2)] text-purple-500 focus:ring-purple-500 focus:ring-2"
                                    />
                                </label>
                            ))}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="flex-1 py-2 bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl text-[var(--muted)] hover:text-[var(--text)] transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => updateNotificationSettings(notificationSettings)}
                                className="flex-1 py-2 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] rounded-xl text-[var(--text)] font-medium hover:opacity-90 transition"
                            >
                                Save Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}












