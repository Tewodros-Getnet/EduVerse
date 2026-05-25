import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, Check, Settings, X } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function NotificationButton() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchNotifications();
        // Set up polling for new notifications
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications/student');
            const notifications = res.data.notifications || [];
            setNotifications(notifications);
            setUnreadCount(notifications.filter(n => !n.read).length);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await api.post(`/notifications/${notificationId}/read`);
            setNotifications(prev => 
                prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            toast.error('Failed to mark notification as read');
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.post('/notifications/student/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
            toast.success('All notifications marked as read');
        } catch (error) {
            toast.error('Failed to mark all as read');
        }
    };

    const deleteNotification = async (notificationId) => {
        try {
            await api.delete(`/notifications/${notificationId}`);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            const deletedNotification = notifications.find(n => n.id === notificationId);
            if (!deletedNotification.read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
            toast.success('Notification deleted');
        } catch (error) {
            toast.error('Failed to delete notification');
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'assignment':
                return '📝';
            case 'quiz':
                return '🎯';
            case 'grade':
                return '📊';
            case 'announcement':
                return '📢';
            case 'reminder':
                return '⏰';
            case 'live_session':
                return '🎥';
            default:
                return '🔔';
        }
    };

    const getNotificationColor = (type) => {
        switch (type) {
            case 'assignment':
                return 'bg-blue-500';
            case 'quiz':
                return 'bg-green-500';
            case 'grade':
                return 'bg-purple-500';
            case 'announcement':
                return 'bg-yellow-500';
            case 'reminder':
                return 'bg-orange-500';
            case 'live_session':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        return date.toLocaleDateString();
    };

    const filteredNotifications = notifications.filter(notification => {
        if (activeTab === 'unread') return !notification.read;
        if (activeTab === 'assignments') return notification.type === 'assignment';
        if (activeTab === 'quizzes') return notification.type === 'quiz';
        if (activeTab === 'grades') return notification.type === 'grade';
        return true;
    });

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Notification Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-400 hover:text-white transition-colors duration-200 group"
            >
                {unreadCount > 0 ? (
                    <BellRing className="w-5 h-5 animate-pulse" />
                ) : (
                    <Bell className="w-5 h-5" />
                )}
                
                {/* Notification Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 shadow-lg animate-bounce">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
                
                {/* Hover effect */}
                <div className="absolute inset-0 bg-white/10 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-200" />
            </button>

            {/* Notification Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-[#1a1a35] border border-purple-900/40 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-purple-900/40">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-white">Notifications</h3>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="p-1 text-xs text-purple-400 hover:text-white hover:bg-purple-600/20 rounded-lg transition-all"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 text-gray-400 hover:text-white hover:bg-gray-600/20 rounded-lg transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        
                        {/* Tabs */}
                        <div className="flex gap-1 p-1 bg-[#12122a] rounded-lg">
                            {['all', 'unread', 'assignments', 'quizzes', 'grades'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${
                                        activeTab === tab
                                            ? 'bg-purple-600 text-white shadow-lg'
                                            : 'text-gray-400 hover:text-white hover:bg-purple-600/20'
                                    }`}
                                >
                                    {tab}
                                    {tab === 'unread' && unreadCount > 0 && (
                                        <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center p-8">
                                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-gray-400">
                                <Bell className="w-12 h-12 mb-3 opacity-50" />
                                <p className="text-sm">No notifications</p>
                                <p className="text-xs mt-1">You're all caught up!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-purple-900/20">
                                {filteredNotifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-[#12122a] transition-colors cursor-pointer ${
                                            !notification.read ? 'bg-purple-600/10' : ''
                                        }`}
                                        onClick={() => !notification.read && markAsRead(notification.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Icon */}
                                            <div className={`w-10 h-10 ${getNotificationColor(notification.type)} rounded-full flex items-center justify-center text-white flex-shrink-0`}>
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            
                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <p className="text-sm text-white font-medium line-clamp-2">
                                                            {notification.title}
                                                        </p>
                                                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                                            {notification.message}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-2">
                                                            {formatTime(notification.created_at)}
                                                        </p>
                                                    </div>
                                                    
                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1 ml-2">
                                                        {!notification.read && (
                                                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteNotification(notification.id);
                                                            }}
                                                            className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-600/20 rounded transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-purple-900/40">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                // Navigate to full notifications page
                                window.location.href = '/notifications';
                            }}
                            className="w-full py-2 text-sm text-purple-400 hover:text-white hover:bg-purple-600/20 rounded-lg transition-all"
                        >
                            View All Notifications
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
