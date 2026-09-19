import React, { useState, useEffect } from 'react';
import { Lock, LogOut, Zap, Shield } from 'lucide-react';
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
        <div className="space-y-6">
            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-medium text-[var(--muted)]">Active Sessions</h3>
                        <p className="text-2xl font-bold text-[var(--text)] mt-2">{stats.active_sessions}</p>
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-medium text-[var(--muted)]">Recent Logins</h3>
                        <p className="text-2xl font-bold text-[var(--status-success)] mt-2">{stats.recent_logins}</p>
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-medium text-[var(--muted)]">Failed Logins</h3>
                        <p className="text-2xl font-bold text-[var(--status-error)] mt-2">{stats.failed_logins}</p>
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-medium text-[var(--muted)]">Security Events</h3>
                        <p className="text-2xl font-bold text-[var(--status-warning)] mt-2">{stats.security_events}</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
                <div className="border-b border-[var(--border)]">
                    <nav className="flex space-x-8 px-6">
                        {['sessions', 'logs', 'events', 'permissions'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${activeTab === tab
                                        ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                                        : 'border-transparent text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border)]'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {/* Sessions Tab */}
                    {activeTab === 'sessions' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-[var(--text)]">Active Sessions</h3>
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        placeholder="User ID"
                                        value={sessionFilters.user_id}
                                        onChange={(e) => setSessionFilters({ ...sessionFilters, user_id: e.target.value })}
                                        className="px-3 py-1 bg-[var(--surface-2)] border border-[var(--border)] rounded text-sm text-[var(--text)] placeholder:text-[var(--muted)]"
                                    />
                                    <select
                                        value={sessionFilters.role}
                                        onChange={(e) => setSessionFilters({ ...sessionFilters, role: e.target.value })}
                                        className="px-3 py-1 bg-[var(--surface-2)] border border-[var(--border)] rounded text-sm text-[var(--text)]"
                                    >
                                        <option value="">All Roles</option>
                                        <option value="student">Student</option>
                                        <option value="instructor">Instructor</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <button
                                        onClick={fetchSessions}
                                        className="px-3 py-1 bg-[var(--accent-primary)] text-[var(--text)] rounded text-sm hover:bg-[var(--accent-primary)]/90 font-medium"
                                    >
                                        Filter
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Table */}
                            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                    <thead className="bg-[var(--surface-2)]">
                                        <tr className="border-b border-[var(--border)]">
                                            <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted)] uppercase whitespace-nowrap">User</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted)] uppercase whitespace-nowrap">IP Address</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted)] uppercase whitespace-nowrap">Last Activity</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted)] uppercase whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border)]">
                                        {sessions.map((session) => (
                                            <tr key={session.id} className="hover:bg-[var(--surface-2)] transition">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-[var(--text)]">{session.name}</div>
                                                        <div className="text-xs text-[var(--muted)]">{session.email}</div>
                                                        <div className="text-xs text-[var(--muted)] capitalize">{session.role}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-[var(--muted)] whitespace-nowrap">
                                                    {session.ip_address}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-[var(--muted)] whitespace-nowrap">
                                                    {new Date(session.last_activity).toLocaleString(undefined, { 
                                                        month: 'short', 
                                                        day: 'numeric', 
                                                        hour: '2-digit', 
                                                        minute: '2-digit' 
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => handleTerminateSession(session.id)}
                                                            className="p-1.5 text-[var(--status-error)] hover:bg-[var(--status-error)]/20 rounded transition"
                                                            title="Terminate session"
                                                            aria-label="Terminate session"
                                                        >
                                                            <LogOut className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleTerminateUserSessions(session.user_id)}
                                                            className="p-1.5 text-[var(--status-warning)] hover:bg-[var(--status-warning)]/20 rounded transition"
                                                            title="Terminate all user sessions"
                                                            aria-label="Terminate all user sessions"
                                                        >
                                                            <Zap className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleForceLogout(session.user_id)}
                                                            className="p-1.5 text-[var(--accent-tertiary)] hover:bg-[var(--accent-tertiary)]/20 rounded transition"
                                                            title="Force logout"
                                                            aria-label="Force logout"
                                                        >
                                                            <Lock className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Activity Logs Tab */}
                    {activeTab === 'logs' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-[var(--text)]">Activity Logs</h3>
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        placeholder="User ID"
                                        value={logFilters.user_id}
                                        onChange={(e) => setLogFilters({ ...logFilters, user_id: e.target.value })}
                                        className="px-3 py-1 bg-[var(--surface-2)] border border-[var(--border)] rounded text-sm text-[var(--text)] placeholder:text-[var(--muted)]"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Action"
                                        value={logFilters.action}
                                        onChange={(e) => setLogFilters({ ...logFilters, action: e.target.value })}
                                        className="px-3 py-1 bg-[var(--surface-2)] border border-[var(--border)] rounded text-sm text-[var(--text)] placeholder:text-[var(--muted)]"
                                    />
                                    <button
                                        onClick={fetchActivityLogs}
                                        className="px-3 py-1 bg-[var(--accent-primary)] text-[var(--text)] rounded text-sm hover:bg-[var(--accent-primary)]/90 font-medium"
                                    >
                                        Filter
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Table */}
                            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                    <thead className="bg-[var(--surface-2)]">
                                        <tr className="border-b border-[var(--border)]">
                                            <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider whitespace-nowrap">User</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider whitespace-nowrap">Action</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider whitespace-nowrap">Details</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider whitespace-nowrap">Level</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider whitespace-nowrap">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border)]">
                                        {activityLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-[var(--surface-2)] transition">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-[var(--text)]">{log.name || 'System'}</div>
                                                        <div className="text-xs text-[var(--muted)]">{log.email || 'N/A'}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-[var(--muted)]">{log.action}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-[var(--muted)] max-w-xs block">{log.details}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
                                                        log.level === 'security' ? 'bg-[var(--status-error)]/20 text-[var(--status-error)]' :
                                                        log.level === 'warning' ? 'bg-[var(--status-warning)]/20 text-[var(--status-warning)]' :
                                                        log.level === 'info' ? 'bg-[var(--status-info)]/20 text-[var(--status-info)]' :
                                                        'bg-[var(--muted)]/20 text-[var(--muted)]'
                                                    }`}>
                                                        {log.level}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-[var(--muted)]">
                                                        {new Date(log.created_at).toLocaleString(undefined, { 
                                                            month: 'short', 
                                                            day: 'numeric', 
                                                            hour: '2-digit', 
                                                            minute: '2-digit' 
                                                        })}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Security Events Tab */}
                    {activeTab === 'events' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-[var(--text)]">Security Events</h3>
                                <div className="flex space-x-2">
                                    <select
                                        value={eventFilters.severity}
                                        onChange={(e) => setEventFilters({ ...eventFilters, severity: e.target.value })}
                                        className="px-3 py-1 bg-[var(--surface-2)] border border-[var(--border)] rounded text-sm text-[var(--text)]"
                                    >
                                        <option value="">All Severities</option>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                    <button
                                        onClick={fetchSecurityEvents}
                                        className="px-3 py-1 bg-[var(--accent-primary)] text-[var(--text)] rounded text-sm hover:bg-[var(--accent-primary)]/90 font-medium"
                                    >
                                        Filter
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Table */}
                            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                    <thead className="bg-[var(--surface-2)]">
                                        <tr className="border-b border-[var(--border)]">
                                            <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted)] uppercase whitespace-nowrap">User</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted)] uppercase whitespace-nowrap">Event</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted)] uppercase whitespace-nowrap">Description</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted)] uppercase whitespace-nowrap">Severity</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted)] uppercase whitespace-nowrap">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border)]">
                                        {securityEvents.map((event) => (
                                            <tr key={event.id} className="hover:bg-[var(--surface-2)] transition">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-[var(--text)]">{event.name || 'System'}</div>
                                                        <div className="text-xs text-[var(--muted)]">{event.email || 'N/A'}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-[var(--muted)] whitespace-nowrap">
                                                    {event.event_type}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-[var(--muted)] max-w-xs whitespace-nowrap">
                                                    {event.description}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
                                                        event.severity === 'critical' ? 'bg-[var(--status-error)]/20 text-[var(--status-error)]' :
                                                        event.severity === 'high' ? 'bg-[var(--status-warning)]/20 text-[var(--status-warning)]' :
                                                        event.severity === 'medium' ? 'bg-[var(--status-info)]/20 text-[var(--status-info)]' :
                                                        'bg-[var(--status-success)]/20 text-[var(--status-success)]'
                                                    }`}>
                                                        {event.severity}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-[var(--muted)] whitespace-nowrap">
                                                    {new Date(event.created_at).toLocaleString(undefined, { 
                                                        month: 'short', 
                                                        day: 'numeric', 
                                                        hour: '2-digit', 
                                                        minute: '2-digit' 
                                                    })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Permissions Tab */}
                    {activeTab === 'permissions' && (
                        <div>
                            <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Role-Based Permissions</h3>
                            <div className="space-y-6">
                                {Object.entries(permissions).map(([roleName, rolePermissions]) => (
                                    <div key={roleName} className="border border-[var(--border)] rounded-lg p-4 bg-[var(--surface-2)]">
                                        <h4 className="font-medium text-[var(--text)] mb-3 capitalize">{roleName} Permissions</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {rolePermissions.map((permission, index) => (
                                                <div key={index} className="flex items-center justify-between p-2 bg-[var(--surface)] rounded border border-[var(--border)]">
                                                    <div>
                                                        <span className="text-sm font-medium text-[var(--text)]">{permission.resource}</span>
                                                        <span className="text-xs text-[var(--muted)] ml-2">({permission.action})</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleUpdatePermission(roleName, permission.resource, permission.action, !permission.granted)}
                                                        className={`px-2 py-1 text-xs rounded font-medium transition ${permission.granted
                                                                ? 'bg-[var(--status-success)]/20 text-[var(--status-success)] hover:bg-[var(--status-success)]/30'
                                                                : 'bg-[var(--status-error)]/20 text-[var(--status-error)] hover:bg-[var(--status-error)]/30'
                                                            }`}
                                                    >
                                                        {permission.granted ? 'Granted' : 'Denied'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination */}
            {totalItems > 20 && (
                <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
                    <div className="text-sm text-[var(--muted)]">
                        Showing page {currentPage}
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 bg-[var(--surface-2)] border border-[var(--border)] rounded text-sm text-[var(--text)] hover:bg-[var(--surface-3)] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(currentPage + 1)}
                            className="px-3 py-1 bg-[var(--surface-2)] border border-[var(--border)] rounded text-sm text-[var(--text)] hover:bg-[var(--surface-3)] font-medium"
                        >
                            Next
                        </button>
                    </div>
                </div>
                </div>
            )}
        </div>
    );
}


