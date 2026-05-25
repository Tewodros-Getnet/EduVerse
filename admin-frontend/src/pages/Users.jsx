import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const ROLE_COLORS = {
    student: 'bg-purple-500/20 text-purple-300',
    instructor: 'bg-blue-500/20 text-blue-300',
    admin: 'bg-green-500/20 text-green-300',
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
                    <h1 className="text-2xl font-bold text-white">User Management</h1>
                    <p className="text-gray-400 text-sm mt-1">{total} total users</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="bg-[#12122a] border border-purple-900/40 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm w-64"
                />
                <select
                    value={roleFilter}
                    onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                    className="bg-[#12122a] border border-purple-900/40 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500 text-sm"
                >
                    <option value="">All Roles</option>
                    <option value="student">Students</option>
                    <option value="instructor">Instructors</option>
                    <option value="admin">Admins</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-purple-900/30">
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">User</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Role</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Status</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Joined</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-500">Loading...</td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-500">No users found</td>
                            </tr>
                        ) : users.map(user => (
                            <tr key={user.id} className="border-b border-purple-900/20 hover:bg-[#1a1a35] transition">
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                            {user.name?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{user.name}</p>
                                            <p className="text-xs text-gray-500">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-3">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[user.role]}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-5 py-3">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-5 py-3 text-sm text-gray-400">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-5 py-3">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => toggleStatus(user.id, user.is_active)}
                                            className={`text-xs px-3 py-1 rounded-lg transition ${user.is_active ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30' : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'}`}
                                        >
                                            {user.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button
                                            onClick={() => deleteUser(user.id)}
                                            className="text-xs px-3 py-1 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition"
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
                <p className="text-sm text-gray-400">Page {page}</p>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-[#12122a] border border-purple-900/40 rounded-xl text-sm text-white disabled:opacity-40 hover:border-purple-500 transition"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={users.length < 15}
                        className="px-4 py-2 bg-[#12122a] border border-purple-900/40 rounded-xl text-sm text-white disabled:opacity-40 hover:border-purple-500 transition"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
