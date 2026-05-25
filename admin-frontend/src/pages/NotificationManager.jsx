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
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500">Total Notifications</h3>
                        <p className="text-2xl font-bold text-gray-900">{stats.total_notifications.toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500">Unread</h3>
                        <p className="text-2xl font-bold text-yellow-600">{stats.unread_notifications.toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500">Recent (7 days)</h3>
                        <p className="text-2xl font-bold text-blue-600">{stats.recent_notifications.toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500">Read Rate</h3>
                        <p className="text-2xl font-bold text-green-600">{stats.read_rate.toFixed(1)}%</p>
                    </div>
                </div>
            )}

            {/* Header and Controls */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Notification Management</h2>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => setShowBroadcastModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            Send Broadcast
                        </button>
                        <button
                            onClick={() => setShowAnnouncementModal(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                            Send Announcement
                        </button>
                        <button
                            onClick={handleMarkAllRead}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
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
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Title
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Recipients
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {notifications.map((notification) => (
                                <tr key={notification.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{notification.title}</div>
                                            <div className="text-sm text-gray-500 truncate max-w-xs">{notification.message}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${notification.type === 'announcement' ? 'bg-blue-100 text-blue-800' :
                                            notification.type === 'broadcast' ? 'bg-green-100 text-green-800' :
                                                notification.type === 'system_alert' ? 'bg-red-100 text-red-800' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {notification.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {notification.recipient_count || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(notification.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleDeleteNotification(notification.id)}
                                            className="text-red-600 hover:text-red-900"
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
                        <div className="text-sm text-gray-700">
                            Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalNotifications)} of {totalNotifications} results
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(Math.min(Math.ceil(totalNotifications / 20), currentPage + 1))}
                                disabled={currentPage >= Math.ceil(totalNotifications / 20)}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
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
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Send Broadcast Message</h3>
                        <form onSubmit={handleBroadcast} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={broadcastForm.title}
                                    onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={broadcastForm.message}
                                    onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Target Roles</label>
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
                                                className="mr-2"
                                            />
                                            <span className="text-sm font-medium text-gray-700 capitalize">{role}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                                >
                                    Send Broadcast
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowBroadcastModal(false)}
                                    className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition"
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
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Send Platform Announcement</h3>
                        <form onSubmit={handleAnnouncement} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={announcementForm.title}
                                    onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={announcementForm.message}
                                    onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    type="submit"
                                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
                                >
                                    Send Announcement
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAnnouncementModal(false)}
                                    className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition"
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
