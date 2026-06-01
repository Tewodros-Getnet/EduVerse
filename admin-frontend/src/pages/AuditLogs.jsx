import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const ACTION_COLORS = {
    USER_ACTIVATED: 'text-green-400',
    USER_DEACTIVATED: 'text-yellow-400',
    USER_DELETED: 'text-red-400',
    default: 'text-blue-400',
};

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const LIMIT = 50;

    useEffect(() => {
        fetchLogs();
    }, [page, actionFilter]);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => { setPage(1); fetchLogs(); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: LIMIT });
            if (actionFilter) params.append('action', actionFilter);
            if (search) params.append('search', search);
            const res = await api.get(`/admin/audit-logs?${params}`);
            setLogs(res.data.logs || []);
            setTotal(res.data.total || 0);
        } catch {
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(total / LIMIT);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
                <p className="text-gray-400 text-sm mt-1">Track all admin actions on the platform</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <input
                    type="text"
                    placeholder="Search by name, email or action..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 min-w-[200px] px-4 py-2 bg-[#12122a] border border-purple-900/40 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <select
                    value={actionFilter}
                    onChange={e => { setActionFilter(e.target.value); setPage(1); }}
                    className="px-4 py-2 bg-[#12122a] border border-purple-900/40 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                >
                    <option value="">All Actions</option>
                    <option value="USER_ACTIVATED">User Activated</option>
                    <option value="USER_DEACTIVATED">User Deactivated</option>
                    <option value="USER_DELETED">User Deleted</option>
                </select>
                <button
                    onClick={() => { setPage(1); fetchLogs(); }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-white text-sm transition"
                >
                    Refresh
                </button>
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
                            <tr><td colSpan={5} className="text-center py-10 text-gray-500">No audit logs found</td></tr>
                        ) : logs.map(log => (
                            <tr key={log.id} className="border-b border-purple-900/20 hover:bg-[#1a1a35] transition">
                                <td className="px-5 py-3">
                                    <span className={`text-sm font-medium ${ACTION_COLORS[log.action] || ACTION_COLORS.default}`}>
                                        {log.action}
                                    </span>
                                </td>
                                <td className="px-5 py-3">
                                    <div className="text-sm text-gray-300">{log.user_name || 'System'}</div>
                                    {log.user_email && <div className="text-xs text-gray-500">{log.user_email}</div>}
                                </td>
                                <td className="px-5 py-3 text-sm text-gray-400">{log.resource || '—'}</td>
                                <td className="px-5 py-3 text-sm text-gray-400">{log.ip_address || '—'}</td>
                                <td className="px-5 py-3 text-sm text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400">
                        Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 bg-[#12122a] border border-purple-900/40 rounded-lg text-sm text-gray-400 hover:text-white disabled:opacity-40 transition"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-400">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="px-3 py-1 bg-[#12122a] border border-purple-900/40 rounded-lg text-sm text-gray-400 hover:text-white disabled:opacity-40 transition"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
