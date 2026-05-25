import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const ACTION_COLORS = {
    USER_ACTIVATED: 'text-green-400', USER_DEACTIVATED: 'text-yellow-400',
    USER_DELETED: 'text-red-400', default: 'text-blue-400',
};

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/audit-logs')
            .then(res => setLogs(res.data.logs))
            .catch(() => toast.error('Failed to load audit logs'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
                <p className="text-gray-400 text-sm mt-1">Track all admin actions on the platform</p>
            </div>

            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-purple-900/30">
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Action</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Admin</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Resource</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">IP</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-10 text-gray-500">Loading...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-10 text-gray-500">No audit logs yet</td></tr>
                        ) : logs.map(log => (
                            <tr key={log.id} className="border-b border-purple-900/20 hover:bg-[#1a1a35] transition">
                                <td className="px-5 py-3">
                                    <span className={`text-sm font-medium ${ACTION_COLORS[log.action] || ACTION_COLORS.default}`}>{log.action}</span>
                                </td>
                                <td className="px-5 py-3 text-sm text-gray-300">{log.user_name || 'System'}</td>
                                <td className="px-5 py-3 text-sm text-gray-400">{log.resource || '—'}</td>
                                <td className="px-5 py-3 text-sm text-gray-400">{log.ip_address || '—'}</td>
                                <td className="px-5 py-3 text-sm text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
