import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const ROLE_COLORS = {
    student: 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]',
    instructor: 'bg-[var(--status-info)]/20 text-[var(--status-info)]',
    admin: 'bg-[var(--status-success)]/20 text-[var(--status-success)]',
};

export default function Users() {
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [page, setPage] = useState(1);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/users', { params: { search, role: roleFilter, page, limit: 15 } });
            setUsers(res.data.users);
            setTotal(res.data.total);
        } catch {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, [search, roleFilter, page]);

    const toggleStatus = async (id, current) => {
        try {
            await api.patch(`/admin/users/${id}/status`, { is_active: !current });
            toast.success('User status updated');
            fetchUsers();
        } catch {
            toast.error('Failed to update status');
        }
    };

    const deleteUser = async (id) => {
        if (!window.confirm('Delete this user? This cannot be undone.')) return;
        try {
            await api.delete(`/admin/users/${id}`);
            toast.success('User deleted');
            fetchUsers();
        } catch {
            toast.error('Failed to delete user');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text)]">User Management</h1>
                    <p className="text-[var(--muted)] text-sm mt-1">{total} total users</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2 text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent-primary)] text-sm w-64"
                />
                <select
                    value={roleFilter}
                    onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2 text-[var(--text)] focus:outline-none focus:border-[var(--accent-primary)] text-sm"
                >
                    <option value="">All Roles</option>
                    <option value="student">Students</option>
                    <option value="instructor">Instructors</option>
                    <option value="admin">Admins</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--border)]">
                            <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--muted)] uppercase">User</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--muted)] uppercase">Role</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--muted)] uppercase">Status</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--muted)] uppercase">Joined</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--muted)] uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-[var(--muted)]">Loading...</td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-[var(--muted)]">No users found</td>
                            </tr>
                        ) : users.map(user => (
                            <tr key={user.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition">
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full flex items-center justify-center text-[var(--text)] text-sm font-bold">
                                            {user.name?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-[var(--text)]">{user.name}</p>
                                            <p className="text-xs text-[var(--muted)]">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-3">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[user.role]}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-5 py-3">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.is_active ? 'bg-[var(--status-success)]/20 text-[var(--status-success)]' : 'bg-[var(--status-error)]/20 text-[var(--status-error)]'}`}>
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-5 py-3 text-sm text-[var(--muted)]">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-5 py-3">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => toggleStatus(user.id, user.is_active)}
                                            className={`text-xs px-3 py-1 rounded-lg transition ${user.is_active ? 'bg-[var(--status-warning)]/20 text-[var(--status-warning)] hover:bg-[var(--status-warning)]/30' : 'bg-[var(--status-success)]/20 text-[var(--status-success)] hover:bg-[var(--status-success)]/30'}`}
                                        >
                                            {user.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button
                                            onClick={() => deleteUser(user.id)}
                                            className="text-xs px-3 py-1 rounded-lg bg-[var(--status-error)]/20 text-[var(--status-error)] hover:bg-[var(--status-error)]/30 transition"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--muted)]">Page {page}</p>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] disabled:opacity-40 hover:border-purple-500 transition"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={users.length < 15}
                        className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] disabled:opacity-40 hover:border-purple-500 transition"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}







