import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function NotificationManager() {
    const [notifications, setNotifications] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalNotifications, setTotalNotifications] = useState(0);
    const [typeFilter, setTypeFilter] = useState('');

    const [broadcastForm, setBroadcastForm] = useState({
        title: '',
        message: '',
        type: 'announcement',
        target_roles: []
    });

    const [announcementForm, setAnnouncementForm] = useState({
        title: '',
        message: '',
        expires_at: ''
    });

    useEffect(() => {
        fetchNotifications();
        fetchStats();
    }, [currentPage, typeFilter]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: currentPage,
                limit: 20,
                ...(typeFilter && { type: typeFilter })
            });

            const response = await api.get(`/notifications/admin/sent?${params}`);
            setNotifications(response.data.notifications);
            setTotalNotifications(response.data.total);
        } catch (error) {
            toast.error('Failed to fetch notifications');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get('/notifications/admin/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats');
        }
    };

    const handleBroadcast = async (e) => {
        e.preventDefault();
        try {
            await api.post('/notifications/admin/broadcast', broadcastForm);
            toast.success('Broadcast message sent successfully');
            setShowBroadcastModal(false);
            setBroadcastForm({ title: '', message: '', type: 'announcement', target_roles: [] });
            fetchNotifications();
            fetchStats();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to send broadcast');
        }
    };

    const handleAnnouncement = async (e) => {
        e.preventDefault();
        try {
            await api.post('/notifications/admin/announcement', announcementForm);
            toast.success('Announcement sent successfully');
            setShowAnnouncementModal(false);
            setAnnouncementForm({ title: '', message: '', expires_at: '' });
            fetchNotifications();
            fetchStats();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to send announcement');
        }
    };

    const handleDeleteNotification = async (notificationId) => {
        if (!window.confirm('Are you sure you want to delete this notification?')) return;

        try {
            await api.delete(`/notifications/admin/${notificationId}`);
            toast.success('Notification deleted successfully');
            fetchNotifications();
            fetchStats();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete notification');
        }
    };

    const handleMarkAllRead = async () => {
        try {
            const response = await api.post('/notifications/admin/mark-all-read');
            toast.success(`${response.data.count} notifications marked as read`);
            fetchStats();
        } catch (error) {
            toast.error('Failed to mark notifications as read');
        }
    };

    if (loading && notifications.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                        <h3 className="text-sm font-medium text-[var(--muted)]">Total Notifications</h3>
                        <p className="text-2xl font-bold text-[var(--text)]">{stats.total_notifications.toLocaleString()}</p>
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                        <h3 className="text-sm font-medium text-[var(--muted)]">Unread</h3>
                        <p className="text-2xl font-bold text-[var(--status-warning)]">{stats.unread_notifications.toLocaleString()}</p>
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                        <h3 className="text-sm font-medium text-[var(--muted)]">Recent (7 days)</h3>
                        <p className="text-2xl font-bold text-[var(--accent-tertiary)]">{stats.recent_notifications.toLocaleString()}</p>
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                        <h3 className="text-sm font-medium text-[var(--muted)]">Read Rate</h3>
                        <p className="text-2xl font-bold text-[var(--status-success)]">{stats.read_rate.toFixed(1)}%</p>
                    </div>
                </div>
            )}

            {/* Header and Controls */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-[var(--text)]">Notification Management</h2>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => setShowBroadcastModal(true)}
                            className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--text)] rounded-xl hover:bg-[var(--accent-primary)]/90 transition"
                        >
                            Send Broadcast
                        </button>
                        <button
                            onClick={() => setShowAnnouncementModal(true)}
                            className="px-4 py-2 bg-[var(--status-success)] text-[var(--text)] rounded-xl hover:bg-[var(--status-success)]/90 transition"
                        >
                            Send Announcement
                        </button>
                        <button
                            onClick={handleMarkAllRead}
                            className="px-4 py-2 bg-[var(--status-warning)] text-[var(--text)] rounded-xl hover:bg-[var(--status-warning)]/90 transition"
                        >
                            Mark All Read
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 mb-6">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                    >
                        <option value="">All Types</option>
                        <option value="announcement">Announcements</option>
                        <option value="broadcast">Broadcasts</option>
                        <option value="system_alert">System Alerts</option>
                        <option value="course_update">Course Updates</option>
                    </select>
                </div>

                {/* Notifications Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--border)]">
                        <thead className="bg-[var(--surface-2)]">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                                    Title
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                                    Type
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                                    Recipients
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                                    Created
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {notifications.map((notification) => (
                                <tr key={notification.id} className="hover:bg-[var(--surface-2)] transition">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-[var(--text)]">{notification.title}</div>
                                            <div className="text-sm text-[var(--muted)] truncate max-w-xs">{notification.message}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span 
                                            className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                                            style={{
                                                backgroundColor: notification.type === 'announcement' ? 'var(--accent-primary)' :
                                                    notification.type === 'broadcast' ? 'var(--status-success)' :
                                                    notification.type === 'system_alert' ? 'var(--status-error)' :
                                                    'var(--muted)',
                                                color: 'var(--text)',
                                                opacity: 0.9
                                            }}
                                        >
                                            {notification.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">
                                        {notification.recipient_count || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">
                                        {new Date(notification.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleDeleteNotification(notification.id)}
                                            className="text-[var(--status-error)] hover:text-[var(--status-error)]/80"
                                            aria-label="Delete notification"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalNotifications > 20 && (
                    <div className="flex items-center justify-between mt-6">
                        <div className="text-sm text-[var(--muted)]">
                            Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalNotifications)} of {totalNotifications} results
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:bg-[var(--surface-3)] disabled:opacity-50 transition"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(Math.min(Math.ceil(totalNotifications / 20), currentPage + 1))}
                                disabled={currentPage >= Math.ceil(totalNotifications / 20)}
                                className="px-3 py-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] hover:bg-[var(--surface-3)] disabled:opacity-50 transition"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Broadcast Modal */}
            {showBroadcastModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Send Broadcast Message</h3>
                        <form onSubmit={handleBroadcast} className="space-y-4">
                            <div>
                                <label htmlFor="broadcast-title" className="block text-sm font-medium text-[var(--muted)] mb-1">Title</label>
                                <input
                                    id="broadcast-title"
                                    type="text"
                                    required
                                    value={broadcastForm.title}
                                    onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                                    placeholder="Enter broadcast title"
                                />
                            </div>
                            <div>
                                <label htmlFor="broadcast-message" className="block text-sm font-medium text-[var(--muted)] mb-1">Message</label>
                                <textarea
                                    id="broadcast-message"
                                    required
                                    rows={4}
                                    value={broadcastForm.message}
                                    onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                                    placeholder="Enter broadcast message"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--muted)] mb-2">Target Roles</label>
                                <div className="space-y-2">
                                    {['student', 'instructor', 'admin'].map(role => (
                                        <label key={role} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={broadcastForm.target_roles.includes(role)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setBroadcastForm({ ...broadcastForm, target_roles: [...broadcastForm.target_roles, role] });
                                                    } else {
                                                        setBroadcastForm({ ...broadcastForm, target_roles: broadcastForm.target_roles.filter(r => r !== role) });
                                                    }
                                                }}
                                                className="mr-2 w-4 h-4 text-[var(--accent-primary)] bg-[var(--surface-2)] border-[var(--border)] rounded focus:ring-[var(--accent-primary)]"
                                            />
                                            <span className="text-sm font-medium text-[var(--text)] capitalize">{role}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex space-x-3 pt-2">
                                <button
                                    type="submit"
                                    className="flex-1 bg-[var(--accent-primary)] text-[var(--text)] py-2 rounded-xl hover:bg-[var(--accent-primary)]/90 transition font-medium"
                                >
                                    Send Broadcast
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowBroadcastModal(false)}
                                    className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] py-2 rounded-xl hover:bg-[var(--surface-3)] transition font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Announcement Modal */}
            {showAnnouncementModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Send Platform Announcement</h3>
                        <form onSubmit={handleAnnouncement} className="space-y-4">
                            <div>
                                <label htmlFor="announcement-title" className="block text-sm font-medium text-[var(--muted)] mb-1">Title</label>
                                <input
                                    id="announcement-title"
                                    type="text"
                                    required
                                    value={announcementForm.title}
                                    onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                                    placeholder="Enter announcement title"
                                />
                            </div>
                            <div>
                                <label htmlFor="announcement-message" className="block text-sm font-medium text-[var(--muted)] mb-1">Message</label>
                                <textarea
                                    id="announcement-message"
                                    required
                                    rows={4}
                                    value={announcementForm.message}
                                    onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                                    placeholder="Enter announcement message"
                                />
                            </div>
                            <div className="flex space-x-3 pt-2">
                                <button
                                    type="submit"
                                    className="flex-1 bg-[var(--status-success)] text-[var(--text)] py-2 rounded-xl hover:bg-[var(--status-success)]/90 transition font-medium"
                                >
                                    Send Announcement
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAnnouncementModal(false)}
                                    className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] py-2 rounded-xl hover:bg-[var(--surface-3)] transition font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}


