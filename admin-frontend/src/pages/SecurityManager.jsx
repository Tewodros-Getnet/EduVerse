import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

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

    useEffect(() => {
        fetchStats();
        if (activeTab === 'sessions') fetchSessions();
        else if (activeTab === 'logs') fetchActivityLogs();
        else if (activeTab === 'events') fetchSecurityEvents();
        else if (activeTab === 'permissions') fetchPermissions();
    }, [activeTab, currentPage]);

    const fetchStats = async () => {
        try {
            const response = await api.get('/security/admin/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats');
        }
    };

    const fetchSessions = async () => {
        try {
            setLoading(true);
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
            console.error('Failed to fetch sessions:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Sessions endpoint not available';
            toast.error(`Failed to fetch sessions: ${errorMsg}`);
            setSessions([]);
            setTotalItems(0);
        } finally {
            setLoading(false);
        }
    };

    const fetchActivityLogs = async () => {
        try {
            setLoading(true);
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
            toast.error('Failed to fetch activity logs');
        } finally {
            setLoading(false);
        }
    };

    const fetchSecurityEvents = async () => {
        try {
            setLoading(true);
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
            toast.error('Failed to fetch security events');
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
        if (!window.confirm('Are you sure you want to terminate this session?')) return;

        try {
            await api.delete(`/security/admin/sessions/${sessionId}`);
            toast.success('Session terminated successfully');
            fetchSessions();
            fetchStats();
        } catch (error) {
            toast.error('Failed to terminate session');
        }
    };

    const handleTerminateUserSessions = async (userId) => {
        if (!window.confirm('Are you sure you want to terminate all sessions for this user?')) return;

        try {
            const response = await api.post(`/security/admin/sessions/terminate-user/${userId}`);
            toast.success(`${response.data.terminated_count} sessions terminated`);
            fetchSessions();
            fetchStats();
        } catch (error) {
            toast.error('Failed to terminate user sessions');
        }
    };

    const handleLockUser = async (userId, locked) => {
        const reason = locked ? prompt('Enter reason for locking user:') : prompt('Enter reason for unlocking user:');
        if (!reason) return;

        try {
            await api.post(`/security/admin/lock-user/${userId}`, { locked, reason });
            toast.success(`User ${locked ? 'locked' : 'unlocked'} successfully`);
            fetchStats();
        } catch (error) {
            toast.error('Failed to update user lock status');
        }
    };

    const handleForceLogout = async (userId) => {
        if (!window.confirm('Are you sure you want to force logout this user from all sessions?')) return;

        try {
            const response = await api.post(`/security/admin/force-logout/${userId}`);
            toast.success(`${response.data.terminated_sessions} sessions terminated`);
            fetchSessions();
            fetchStats();
        } catch (error) {
            toast.error('Failed to force logout user');
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
            toast.success('Permission updated successfully');
            fetchPermissions();
        } catch (error) {
            toast.error('Failed to update permission');
        }
    };

    if (loading && activeTab !== 'permissions') {
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
                        <h3 className="text-sm font-medium text-gray-500">Active Sessions</h3>
                        <p className="text-2xl font-bold text-gray-900">{stats.active_sessions}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500">Recent Logins</h3>
                        <p className="text-2xl font-bold text-green-600">{stats.recent_logins}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500">Failed Logins</h3>
                        <p className="text-2xl font-bold text-red-600">{stats.failed_logins}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500">Security Events</h3>
                        <p className="text-2xl font-bold text-yellow-600">{stats.security_events}</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow">
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6">
                        {['sessions', 'logs', 'events', 'permissions'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                                <h3 className="text-lg font-semibold text-gray-900">Active Sessions</h3>
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        placeholder="User ID"
                                        value={sessionFilters.user_id}
                                        onChange={(e) => setSessionFilters({ ...sessionFilters, user_id: e.target.value })}
                                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                                    />
                                    <select
                                        value={sessionFilters.role}
                                        onChange={(e) => setSessionFilters({ ...sessionFilters, role: e.target.value })}
                                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                                    >
                                        <option value="">All Roles</option>
                                        <option value="student">Student</option>
                                        <option value="instructor">Instructor</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <button
                                        onClick={fetchSessions}
                                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                    >
                                        Filter
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {sessions.map((session) => (
                                            <tr key={session.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{session.name}</div>
                                                        <div className="text-sm text-gray-500">{session.email}</div>
                                                        <div className="text-xs text-gray-400">{session.role}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {session.ip_address}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(session.last_activity).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => handleTerminateSession(session.id)}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            Terminate
                                                        </button>
                                                        <button
                                                            onClick={() => handleTerminateUserSessions(session.user_id)}
                                                            className="text-yellow-600 hover:text-yellow-900"
                                                        >
                                                            All Sessions
                                                        </button>
                                                        <button
                                                            onClick={() => handleForceLogout(session.user_id)}
                                                            className="text-orange-600 hover:text-orange-900"
                                                        >
                                                            Force Logout
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Activity Logs Tab */}
                    {activeTab === 'logs' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Activity Logs</h3>
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        placeholder="User ID"
                                        value={logFilters.user_id}
                                        onChange={(e) => setLogFilters({ ...logFilters, user_id: e.target.value })}
                                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Action"
                                        value={logFilters.action}
                                        onChange={(e) => setLogFilters({ ...logFilters, action: e.target.value })}
                                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                                    />
                                    <button
                                        onClick={fetchActivityLogs}
                                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                    >
                                        Filter
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {activityLogs.map((log) => (
                                            <tr key={log.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{log.name || 'System'}</div>
                                                        <div className="text-sm text-gray-500">{log.email || 'N/A'}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {log.action}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                    {log.details}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.level === 'security' ? 'bg-red-100 text-red-800' :
                                                            log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                                                log.level === 'info' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {log.level}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Security Events Tab */}
                    {activeTab === 'events' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Security Events</h3>
                                <div className="flex space-x-2">
                                    <select
                                        value={eventFilters.severity}
                                        onChange={(e) => setEventFilters({ ...eventFilters, severity: e.target.value })}
                                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                                    >
                                        <option value="">All Severities</option>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                    <button
                                        onClick={fetchSecurityEvents}
                                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                    >
                                        Filter
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {securityEvents.map((event) => (
                                            <tr key={event.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{event.name || 'System'}</div>
                                                        <div className="text-sm text-gray-500">{event.email || 'N/A'}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {event.event_type}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                    {event.description}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${event.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                                            event.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                                                event.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-blue-100 text-blue-800'
                                                        }`}>
                                                        {event.severity}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(event.created_at).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Permissions Tab */}
                    {activeTab === 'permissions' && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Role-Based Permissions</h3>
                            <div className="space-y-6">
                                {Object.entries(permissions).map(([roleName, rolePermissions]) => (
                                    <div key={roleName} className="border border-gray-200 rounded-lg p-4">
                                        <h4 className="font-medium text-gray-900 mb-3 capitalize">{roleName} Permissions</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {rolePermissions.map((permission, index) => (
                                                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                    <div>
                                                        <span className="text-sm font-medium text-gray-700">{permission.resource}</span>
                                                        <span className="text-xs text-gray-500 ml-2">({permission.action})</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleUpdatePermission(roleName, permission.resource, permission.action, !permission.granted)}
                                                        className={`px-2 py-1 text-xs rounded ${permission.granted
                                                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                                : 'bg-red-100 text-red-800 hover:bg-red-200'
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
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                        Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalItems)} of {totalItems} results
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
                            onClick={() => setCurrentPage(Math.min(Math.ceil(totalItems / 20), currentPage + 1))}
                            disabled={currentPage >= Math.ceil(totalItems / 20)}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
