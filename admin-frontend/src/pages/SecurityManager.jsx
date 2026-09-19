import React, { useState, useEffect } from 'react';
import { Lock, LogOut, Zap, Shield, Activity, AlertTriangle, Users, Clock, MapPin, Monitor } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

// Validation utilities
const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

const isValidDate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
};

const validateUserIdInput = (userId) => {
    if (!userId || userId.trim() === '') return null; // Optional field
    if (!isValidUUID(userId)) return 'Invalid user ID format (must be UUID)';
    return null;
};

const validateDateRange = (startDate, endDate) => {
    if (!startDate && !endDate) return null; // Both optional
    if (startDate && !isValidDate(startDate)) return 'Invalid start date';
    if (endDate && !isValidDate(endDate)) return 'Invalid end date';
    if (startDate && endDate) {
        if (new Date(startDate) > new Date(endDate)) {
            return 'Start date must be before end date';
        }
    }
    return null;
};

const validateLockReason = (reason) => {
    if (!reason || reason.trim() === '') return 'Reason is required';
    if (reason.length < 3) return 'Reason must be at least 3 characters';
    if (reason.length > 500) return 'Reason must not exceed 500 characters';
    return null;
};

export default function SecurityManager() {
    const [activeTab, setActiveTab] = useState('sessions');
    const [sessions, setSessions] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [securityEvents, setSecurityEvents] = useState([]);
    const [permissions, setPermissions] = useState({});
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Filter states
    const [sessionFilters, setSessionFilters] = useState({ user_id: '', role: '' });
    const [logFilters, setLogFilters] = useState({ user_id: '', action: '', level: '', start_date: '', end_date: '' });
    const [eventFilters, setEventFilters] = useState({ severity: '', start_date: '', end_date: '' });
    
    // Error states
    const [filterErrors, setFilterErrors] = useState({});
    const [statsCache, setStatsCache] = useState(null);
    const [statsCachetime, setStatsCacheTime] = useState(null);

    useEffect(() => {
        fetchStats(); // Fetch stats only once on mount
    }, []);

    useEffect(() => {
        // Reset pagination when changing tabs
        setCurrentPage(1);
        if (activeTab === 'sessions') fetchSessions();
        else if (activeTab === 'logs') fetchActivityLogs();
        else if (activeTab === 'events') fetchSecurityEvents();
        else if (activeTab === 'permissions') fetchPermissions();
    }, [activeTab]);

    const fetchStats = async () => {
        // Use cache if available (cache for 30 seconds)
        const now = Date.now();
        if (statsCache && statsCachetime && (now - statsCachetime) < 30000) {
            setStats(statsCache);
            return;
        }

        try {
            const response = await api.get('/security/admin/stats');
            setStats(response.data);
            setStatsCache(response.data);
            setStatsCacheTime(now);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            toast.error('Failed to load security stats');
        }
    };

    const fetchSessions = async () => {
        try {
            setLoading(true);
            setFilterErrors({});
            
            // Validate filters
            const userIdError = validateUserIdInput(sessionFilters.user_id);
            if (userIdError) {
                setFilterErrors({ user_id: userIdError });
                toast.error(userIdError);
                setSessions([]);
                setTotalItems(0);
                return;
            }

            const params = new URLSearchParams({
                page: currentPage,
                limit: 20,
                ...(sessionFilters.user_id && { user_id: sessionFilters.user_id }),
                ...(sessionFilters.role && { role: sessionFilters.role })
            });

            const response = await api.get(`/security/admin/sessions?${params}`);
            setSessions(response.data.sessions || []);
            setTotalItems(response.data.total || 0);
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message || 'Failed to fetch sessions';
            console.error('Failed to fetch sessions:', error);
            toast.error(errorMsg);
            setSessions([]);
            setTotalItems(0);
        } finally {
            setLoading(false);
        }
    };

    const fetchActivityLogs = async () => {
        try {
            setLoading(true);
            setFilterErrors({});
            
            // Validate filters
            const userIdError = validateUserIdInput(logFilters.user_id);
            const dateError = validateDateRange(logFilters.start_date, logFilters.end_date);
            
            const errors = {};
            if (userIdError) errors.user_id = userIdError;
            if (dateError) errors.date_range = dateError;
            
            if (Object.keys(errors).length > 0) {
                setFilterErrors(errors);
                toast.error(Object.values(errors)[0]);
                setActivityLogs([]);
                setTotalItems(0);
                return;
            }

            const params = new URLSearchParams({
                page: currentPage,
                limit: 50,
                ...(logFilters.user_id && { user_id: logFilters.user_id }),
                ...(logFilters.action && { action: logFilters.action }),
                ...(logFilters.level && { level: logFilters.level }),
                ...(logFilters.start_date && { start_date: logFilters.start_date }),
                ...(logFilters.end_date && { end_date: logFilters.end_date })
            });

            const response = await api.get(`/security/admin/activity-logs?${params}`);
            setActivityLogs(response.data.logs);
            setTotalItems(response.data.total);
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Failed to fetch activity logs';
            console.error('Failed to fetch activity logs:', error);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const fetchSecurityEvents = async () => {
        try {
            setLoading(true);
            setFilterErrors({});
            
            // Validate date range
            const dateError = validateDateRange(eventFilters.start_date, eventFilters.end_date);
            if (dateError) {
                setFilterErrors({ date_range: dateError });
                toast.error(dateError);
                setSecurityEvents([]);
                setTotalItems(0);
                return;
            }

            const params = new URLSearchParams({
                page: currentPage,
                limit: 20,
                ...(eventFilters.severity && { severity: eventFilters.severity }),
                ...(eventFilters.start_date && { start_date: eventFilters.start_date }),
                ...(eventFilters.end_date && { end_date: eventFilters.end_date })
            });

            const response = await api.get(`/security/admin/security-events?${params}`);
            setSecurityEvents(response.data.events);
            setTotalItems(response.data.total);
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Failed to fetch security events';
            console.error('Failed to fetch security events:', error);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const fetchPermissions = async () => {
        try {
            const response = await api.get('/security/admin/permissions');
            setPermissions(response.data.permissions);
        } catch (error) {
            toast.error('Failed to fetch permissions');
        }
    };

    const handleTerminateSession = async (sessionId) => {
        if (!window.confirm('Are you sure you want to terminate this session? The user will be logged out.')) return;

        try {
            await api.delete(`/security/admin/sessions/${sessionId}`);
            toast.success('Session terminated successfully');
            fetchSessions();
            fetchStats();
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Failed to terminate session';
            toast.error(errorMsg);
        }
    };

    const handleTerminateUserSessions = async (userId) => {
        if (!window.confirm('Are you sure you want to terminate ALL sessions for this user? They will be logged out everywhere.')) return;

        try {
            const response = await api.post(`/security/admin/sessions/terminate-user/${userId}`);
            toast.success(`${response.data.terminated_count} session(s) terminated`);
            fetchSessions();
            fetchStats();
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Failed to terminate user sessions';
            toast.error(errorMsg);
        }
    };

    const handleLockUser = async (userId, locked) => {
        const action = locked ? 'lock' : 'unlock';
        const reason = prompt(`Enter reason for ${action}ing user (min 3 chars, max 500 chars):`);
        
        const reasonError = validateLockReason(reason);
        if (reasonError) {
            toast.error(reasonError);
            return;
        }

        try {
            await api.post(`/security/admin/lock-user/${userId}`, { locked, reason });
            toast.success(`User ${locked ? 'locked' : 'unlocked'} successfully`);
            fetchStats();
            fetchSessions();
        } catch (error) {
            const errorMsg = error.response?.data?.error || `Failed to ${action} user`;
            toast.error(errorMsg);
        }
    };

    const handleForceLogout = async (userId) => {
        if (!window.confirm('Force logout will immediately terminate all sessions for this user. Continue?')) return;

        try {
            const response = await api.post(`/security/admin/force-logout/${userId}`);
            toast.success(`${response.data.terminated_sessions} session(s) terminated`);
            fetchSessions();
            fetchStats();
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Failed to force logout user';
            toast.error(errorMsg);
        }
    };

    const handleUpdatePermission = async (roleName, resource, action, granted) => {
        try {
            await api.put('/security/admin/permissions', {
                role_name: roleName,
                resource,
                action,
                granted
            });
            toast.success(`Permission ${granted ? 'granted' : 'denied'} successfully`);
            fetchPermissions();
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Failed to update permission';
            toast.error(errorMsg);
        }
    };

    if (loading && activeTab !== 'permissions') {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text)]">Security Center</h1>
                    <p className="text-sm text-[var(--muted)]">Monitor sessions, events, and permissions</p>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-2xl p-5 hover:shadow-lg hover:shadow-purple-500/10 transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                <Users className="w-5 h-5 text-purple-400" />
                            </div>
                            <span className="text-xs font-medium text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full">Live</span>
                        </div>
                        <h3 className="text-sm font-medium text-[var(--muted)] mb-1">Active Sessions</h3>
                        <p className="text-3xl font-bold text-[var(--text)]">{stats.active_sessions}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/20 rounded-2xl p-5 hover:shadow-lg hover:shadow-green-500/10 transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                                <Activity className="w-5 h-5 text-green-400" />
                            </div>
                            <span className="text-xs font-medium text-green-400 bg-green-500/20 px-2 py-1 rounded-full">24h</span>
                        </div>
                        <h3 className="text-sm font-medium text-[var(--muted)] mb-1">Recent Logins</h3>
                        <p className="text-3xl font-bold text-[var(--text)]">{stats.recent_logins}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-red-500/10 to-rose-600/10 border border-red-500/20 rounded-2xl p-5 hover:shadow-lg hover:shadow-red-500/10 transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                            </div>
                            <span className="text-xs font-medium text-red-400 bg-red-500/20 px-2 py-1 rounded-full">Alert</span>
                        </div>
                        <h3 className="text-sm font-medium text-[var(--muted)] mb-1">Failed Logins</h3>
                        <p className="text-3xl font-bold text-[var(--text)]">{stats.failed_logins}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-yellow-500/10 to-orange-600/10 border border-yellow-500/20 rounded-2xl p-5 hover:shadow-lg hover:shadow-yellow-500/10 transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-yellow-400" />
                            </div>
                            <span className="text-xs font-medium text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded-full">Watch</span>
                        </div>
                        <h3 className="text-sm font-medium text-[var(--muted)] mb-1">Security Events</h3>
                        <p className="text-3xl font-bold text-[var(--text)]">{stats.security_events}</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-1.5 shadow-sm overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                    {[
                        { id: 'sessions', label: 'Active Sessions', icon: Monitor },
                        { id: 'logs', label: 'Activity Logs', icon: Activity },
                        { id: 'events', label: 'Security Events', icon: AlertTriangle },
                        { id: 'permissions', label: 'Permissions', icon: Lock }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
            {/* Content Container */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6">
                    {/* Sessions Tab */}
                    {activeTab === 'sessions' && (
                        <div className="space-y-4">
                            {/* Filters */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="text"
                                    placeholder="Filter by User ID..."
                                    value={sessionFilters.user_id}
                                    onChange={(e) => setSessionFilters({ ...sessionFilters, user_id: e.target.value })}
                                    className="flex-1 px-4 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-purple-500 transition"
                                />
                                <select
                                    value={sessionFilters.role}
                                    onChange={(e) => setSessionFilters({ ...sessionFilters, role: e.target.value })}
                                    className="px-4 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] focus:outline-none focus:border-purple-500 transition"
                                >
                                    <option value="">All Roles</option>
                                    <option value="student">Student</option>
                                    <option value="instructor">Instructor</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <button
                                    onClick={fetchSessions}
                                    className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all whitespace-nowrap"
                                >
                                    Apply Filters
                                </button>
                            </div>

                            {/* Session Cards */}
                            {sessions.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
                                        <Users className="w-8 h-8 text-[var(--muted)]" />
                                    </div>
                                    <p className="text-[var(--muted)] text-sm">No active sessions found</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {sessions.map((session) => (
                                        <div key={session.id} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 hover:border-purple-500/50 transition-all">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                {/* User Info */}
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-white font-semibold text-sm">
                                                            {session.name?.charAt(0)?.toUpperCase() || 'U'}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-[var(--text)] truncate">{session.name}</h4>
                                                        <p className="text-xs text-[var(--muted)] truncate">{session.email}</p>
                                                        <div className="flex flex-wrap items-center gap-3 mt-2">
                                                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                                                                session.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                                                                session.role === 'instructor' ? 'bg-blue-500/20 text-blue-400' :
                                                                'bg-green-500/20 text-green-400'
                                                            }`}>
                                                                <Users className="w-3 h-3" />
                                                                {session.role}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                                                                <MapPin className="w-3 h-3" />
                                                                {session.ip_address}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                                                                <Clock className="w-3 h-3" />
                                                                {new Date(session.last_activity).toLocaleString(undefined, { 
                                                                    month: 'short', 
                                                                    day: 'numeric', 
                                                                    hour: '2-digit', 
                                                                    minute: '2-digit' 
                                                                })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => handleTerminateSession(session.id)}
                                                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                                                        title="Terminate session"
                                                    >
                                                        <LogOut className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleTerminateUserSessions(session.user_id)}
                                                        className="p-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition"
                                                        title="Terminate all user sessions"
                                                    >
                                                        <Zap className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleForceLogout(session.user_id)}
                                                        className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg transition"
                                                        title="Force logout"
                                                    >
                                                        <Lock className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Activity Logs Tab */}
                    {activeTab === 'logs' && (
                        <div className="space-y-4">
                            {/* Filters */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="text"
                                    placeholder="User ID"
                                    value={logFilters.user_id}
                                    onChange={(e) => setLogFilters({ ...logFilters, user_id: e.target.value })}
                                    className="flex-1 px-4 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-purple-500 transition"
                                />
                                <input
                                    type="text"
                                    placeholder="Action"
                                    value={logFilters.action}
                                    onChange={(e) => setLogFilters({ ...logFilters, action: e.target.value })}
                                    className="flex-1 px-4 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-purple-500 transition"
                                />
                                <button
                                    onClick={fetchActivityLogs}
                                    className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all whitespace-nowrap"
                                >
                                    Apply Filters
                                </button>
                            </div>

                            {/* Activity Log Cards */}
                            {activityLogs.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
                                        <Activity className="w-8 h-8 text-[var(--muted)]" />
                                    </div>
                                    <p className="text-[var(--muted)] text-sm">No activity logs found</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activityLogs.map((log) => (
                                        <div key={log.id} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 hover:border-purple-500/50 transition-all">
                                            <div className="flex items-start gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                    log.level === 'security' ? 'bg-red-500/20' :
                                                    log.level === 'warning' ? 'bg-yellow-500/20' :
                                                    log.level === 'info' ? 'bg-blue-500/20' :
                                                    'bg-gray-500/20'
                                                }`}>
                                                    <Activity className={`w-4 h-4 ${
                                                        log.level === 'security' ? 'text-red-400' :
                                                        log.level === 'warning' ? 'text-yellow-400' :
                                                        log.level === 'info' ? 'text-blue-400' :
                                                        'text-gray-400'
                                                    }`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <div>
                                                            <h4 className="font-semibold text-[var(--text)] text-sm">{log.name || 'System'}</h4>
                                                            <p className="text-xs text-[var(--muted)]">{log.email || 'N/A'}</p>
                                                        </div>
                                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                                                            log.level === 'security' ? 'bg-red-500/20 text-red-400' :
                                                            log.level === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            log.level === 'info' ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-gray-500/20 text-gray-400'
                                                        }`}>
                                                            {log.level}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-[var(--text)] font-medium mb-1">{log.action}</p>
                                                    <p className="text-xs text-[var(--muted)] mb-2">{log.details}</p>
                                                    <p className="text-xs text-[var(--muted)] flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(log.created_at).toLocaleString(undefined, { 
                                                            month: 'short', 
                                                            day: 'numeric', 
                                                            hour: '2-digit', 
                                                            minute: '2-digit' 
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Security Events Tab */}
                    {activeTab === 'events' && (
                        <div className="space-y-4">
                            {/* Filters */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <select
                                    value={eventFilters.severity}
                                    onChange={(e) => setEventFilters({ ...eventFilters, severity: e.target.value })}
                                    className="flex-1 px-4 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] focus:outline-none focus:border-purple-500 transition"
                                >
                                    <option value="">All Severities</option>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                                <button
                                    onClick={fetchSecurityEvents}
                                    className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all whitespace-nowrap"
                                >
                                    Apply Filter
                                </button>
                            </div>

                            {/* Security Event Cards */}
                            {securityEvents.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
                                        <Shield className="w-8 h-8 text-[var(--muted)]" />
                                    </div>
                                    <p className="text-[var(--muted)] text-sm">No security events found</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {securityEvents.map((event) => (
                                        <div key={event.id} className={`border rounded-xl p-4 transition-all ${
                                            event.severity === 'critical' ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50' :
                                            event.severity === 'high' ? 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50' :
                                            event.severity === 'medium' ? 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50' :
                                            'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
                                        }`}>
                                            <div className="flex items-start gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                    event.severity === 'critical' ? 'bg-red-500/20' :
                                                    event.severity === 'high' ? 'bg-yellow-500/20' :
                                                    event.severity === 'medium' ? 'bg-blue-500/20' :
                                                    'bg-green-500/20'
                                                }`}>
                                                    <AlertTriangle className={`w-5 h-5 ${
                                                        event.severity === 'critical' ? 'text-red-400' :
                                                        event.severity === 'high' ? 'text-yellow-400' :
                                                        event.severity === 'medium' ? 'text-blue-400' :
                                                        'text-green-400'
                                                    }`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <div>
                                                            <h4 className="font-semibold text-[var(--text)]">{event.event_type}</h4>
                                                            <p className="text-xs text-[var(--muted)]">{event.name || 'System'} • {event.email || 'N/A'}</p>
                                                        </div>
                                                        <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase flex-shrink-0 ${
                                                            event.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                                                            event.severity === 'high' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            event.severity === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-green-500/20 text-green-400'
                                                        }`}>
                                                            {event.severity}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-[var(--text)] mb-2">{event.description}</p>
                                                    <p className="text-xs text-[var(--muted)] flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(event.created_at).toLocaleString(undefined, { 
                                                            month: 'short', 
                                                            day: 'numeric', 
                                                            hour: '2-digit', 
                                                            minute: '2-digit' 
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Permissions Tab */}
                    {activeTab === 'permissions' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Lock className="w-5 h-5 text-purple-500" />
                                <h3 className="text-lg font-semibold text-[var(--text)]">Role-Based Access Control</h3>
                            </div>
                            
                            {Object.entries(permissions).length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
                                        <Lock className="w-8 h-8 text-[var(--muted)]" />
                                    </div>
                                    <p className="text-[var(--muted)] text-sm">No permissions configured</p>
                                </div>
                            ) : (
                                <div className="grid gap-6">
                                    {Object.entries(permissions).map(([roleName, rolePermissions]) => (
                                        <div key={roleName} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl overflow-hidden">
                                            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-[var(--border)] px-5 py-4">
                                                <h4 className="font-bold text-[var(--text)] capitalize flex items-center gap-2">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                        roleName === 'admin' ? 'bg-purple-500/20' :
                                                        roleName === 'instructor' ? 'bg-blue-500/20' :
                                                        'bg-green-500/20'
                                                    }`}>
                                                        <Users className={`w-4 h-4 ${
                                                            roleName === 'admin' ? 'text-purple-400' :
                                                            roleName === 'instructor' ? 'text-blue-400' :
                                                            'text-green-400'
                                                        }`} />
                                                    </div>
                                                    {roleName} Permissions
                                                </h4>
                                            </div>
                                            <div className="p-5">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {rolePermissions.map((permission, index) => (
                                                        <div key={index} className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)] hover:border-purple-500/50 transition-all">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-[var(--text)] truncate">{permission.resource}</p>
                                                                <p className="text-xs text-[var(--muted)] capitalize">{permission.action}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleUpdatePermission(roleName, permission.resource, permission.action, !permission.granted)}
                                                                className={`px-3 py-1.5 text-xs rounded-lg font-bold uppercase transition-all flex-shrink-0 ml-2 ${
                                                                    permission.granted
                                                                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                                                }`}
                                                            >
                                                                {permission.granted ? '✓ Allow' : '✕ Deny'}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination */}
            {totalItems > 20 && (
                <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
                    <div className="text-sm text-[var(--muted)]">
                        Showing page <span className="font-semibold text-[var(--text)]">{currentPage}</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--surface-2)] disabled:hover:text-[var(--text)] font-medium transition-all"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(currentPage + 1)}
                            className="px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 hover:text-white font-medium transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}


