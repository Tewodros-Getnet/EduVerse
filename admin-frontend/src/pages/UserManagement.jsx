import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, RotateCcw, Plus } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [stats, setStats] = useState(null);

    const [createForm, setCreateForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'student'
    });

    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        role: '',
        is_active: true
    });
    useEffect(() => {
        fetchUsers();
        fetchStats();
    }, [currentPage, roleFilter, statusFilter, search]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: currentPage,
                limit: 20,
                ...(roleFilter && { role: roleFilter }),
                ...(statusFilter && { status: statusFilter }),
                ...(search && { search })
            });

            const response = await api.get(`/users/admin/all?${params}`);
            setUsers(response.data.users);
            setTotalUsers(response.data.total);
        } catch (error) {
            toast.error('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get('/users/admin/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats');
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await api.post('/users/admin/create', createForm);
            toast.success('User created successfully');
            setShowCreateModal(false);
            setCreateForm({ name: '', email: '', password: '', role: 'student' });
            fetchUsers();
            fetchStats();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create user');
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/users/admin/${selectedUser.id}`, editForm);
            toast.success('User updated successfully');
            setShowEditModal(false);
            setSelectedUser(null);
            fetchUsers();
            fetchStats();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update user');
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        try {
            await api.delete(`/users/admin/${selectedUser.id}`);
            toast.success('User deleted successfully');
            setShowDeleteModal(false);
            setSelectedUser(null);
            fetchUsers();
            fetchStats();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete user');
        }
    };

    const handleToggleStatus = async (user) => {
        try {
            await api.post(`/users/admin/${user.id}/toggle-status`);
            toast.success(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`);
            fetchUsers();
            fetchStats();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to toggle status');
        }
    };

    const handleResetPassword = async () => {
        if (!selectedUser || !newPassword.trim()) {
            toast.error('Please enter a new password');
            return;
        }
        try {
            await api.post(`/users/admin/${selectedUser.id}/reset-password`, { newPassword });
            toast.success('Password reset successfully');
            setShowResetModal(false);
            setSelectedUser(null);
            setNewPassword('');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to reset password');
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setEditForm({
            name: user.name,
            email: user.email,
            role: user.role,
            is_active: user.is_active
        });
        setShowEditModal(true);
    };

    if (loading && users.length === 0) {
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
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-medium text-[var(--muted)]">Total Users</h3>
                        <p className="text-2xl font-bold text-[var(--text)] mt-2">{stats.total_users}</p>
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-medium text-[var(--muted)]">Active Users</h3>
                        <p className="text-2xl font-bold text-green-500 mt-2">{stats.active_users}</p>
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-medium text-[var(--muted)]">Students</h3>
                        <p className="text-2xl font-bold text-blue-500 mt-2">{stats.students}</p>
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-medium text-[var(--muted)]">Instructors</h3>
                        <p className="text-2xl font-bold text-purple-500 mt-2">{stats.instructors}</p>
                    </div>
                </div>
            )}

            {/* Header and Controls */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-[var(--text)]">User Management</h2>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Add User
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 min-w-[200px] px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder:text-[var(--muted)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Roles</option>
                        <option value="student">Students</option>
                        <option value="instructor">Instructors</option>
                        <option value="admin">Admins</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--border)]">
                        <thead className="bg-[var(--surface-2)]">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                                    Courses
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                                    Joined
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-[var(--surface-2)] transition">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-[var(--text)]">{user.name}</div>
                                            <div className="text-sm text-[var(--muted)]">{user.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                                            user.role === 'instructor' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-green-500/20 text-green-400'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            user.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">
                                        {user.course_count || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded transition"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(user)}
                                                className="p-1.5 text-yellow-400 hover:bg-yellow-500/20 rounded transition"
                                                title={user.is_active ? 'Deactivate' : 'Activate'}
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedUser(user); setShowResetModal(true); }}
                                                className="p-1.5 text-green-400 hover:bg-green-500/20 rounded transition"
                                                title="Reset password"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedUser(user); setShowDeleteModal(true); }}
                                                className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalUsers > 20 && (
                    <div className="flex items-center justify-between mt-6">
                        <div className="text-sm text-[var(--muted)]">
                            Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalUsers)} of {totalUsers} results
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border border-[var(--border)] rounded-md text-sm text-[var(--text)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(Math.min(Math.ceil(totalUsers / 20), currentPage + 1))}
                                disabled={currentPage >= Math.ceil(totalUsers / 20)}
                                className="px-3 py-1 border border-[var(--border)] rounded-md text-sm text-[var(--text)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Create New User</h3>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--muted)] mb-2">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                                    className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder:text-[var(--muted)] focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--muted)] mb-2">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                                    className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder:text-[var(--muted)] focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--muted)] mb-2">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={createForm.password}
                                    onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                                    className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder:text-[var(--muted)] focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--muted)] mb-2">Role</label>
                                <select
                                    value={createForm.role}
                                    onChange={(e) => setCreateForm({...createForm, role: e.target.value})}
                                    className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="student">Student</option>
                                    <option value="instructor">Instructor</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex space-x-3 pt-2">
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                                >
                                    Create User
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 bg-[var(--surface-2)] text-[var(--text)] py-2 rounded-lg hover:bg-[var(--surface-3)] border border-[var(--border)] transition font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Edit User</h3>
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--muted)] mb-2">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                    className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder:text-[var(--muted)] focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--muted)] mb-2">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                    className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder:text-[var(--muted)] focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--muted)] mb-2">Role</label>
                                <select
                                    value={editForm.role}
                                    onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                                    className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="student">Student</option>
                                    <option value="instructor">Instructor</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={editForm.is_active}
                                        onChange={(e) => setEditForm({...editForm, is_active: e.target.checked})}
                                        className="mr-2 w-4 h-4 rounded"
                                    />
                                    <span className="text-sm font-medium text-[var(--text)]">Active</span>
                                </label>
                            </div>
                            <div className="flex space-x-3 pt-2">
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                                >
                                    Update User
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 bg-[var(--surface-2)] text-[var(--text)] py-2 rounded-lg hover:bg-[var(--surface-3)] border border-[var(--border)] transition font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Delete User</h3>
                        <p className="text-sm text-[var(--muted)] mb-6">
                            Are you sure you want to delete <strong className="text-[var(--text)]">{selectedUser.name}</strong>? This action cannot be undone.
                        </p>
                        <div className="flex space-x-3">
                            <button
                                onClick={handleDeleteUser}
                                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition font-medium"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => { setShowDeleteModal(false); setSelectedUser(null); }}
                                className="flex-1 bg-[var(--surface-2)] text-[var(--text)] py-2 rounded-lg hover:bg-[var(--surface-3)] border border-[var(--border)] transition font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetModal && selectedUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Reset Password</h3>
                        <p className="text-sm text-[var(--muted)] mb-4">
                            Set a new password for <strong className="text-[var(--text)]">{selectedUser.name}</strong>.
                        </p>
                        <input
                            type="password"
                            placeholder="New password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder:text-[var(--muted)] focus:ring-2 focus:ring-blue-500 mb-4"
                        />
                        <div className="flex space-x-3">
                            <button
                                onClick={handleResetPassword}
                                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium"
                            >
                                Reset Password
                            </button>
                            <button
                                onClick={() => { setShowResetModal(false); setSelectedUser(null); setNewPassword(''); }}
                                className="flex-1 bg-[var(--surface-2)] text-[var(--text)] py-2 rounded-lg hover:bg-[var(--surface-3)] border border-[var(--border)] transition font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
