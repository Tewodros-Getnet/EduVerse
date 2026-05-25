import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
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

    const handleDeleteUser = async (user) => {
        if (!window.confirm(`Are you sure you want to delete ${user.name}?`)) return;
        
        try {
            await api.delete(`/users/admin/${user.id}`);
            toast.success('User deleted successfully');
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

    const handleResetPassword = async (user) => {
        const newPassword = prompt('Enter new password:');
        if (!newPassword) return;

        try {
            await api.post(`/users/admin/${user.id}/reset-password`, { newPassword });
            toast.success('Password reset successfully');
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
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                        <p className="text-2xl font-bold text-gray-900">{stats.total_users}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
                        <p className="text-2xl font-bold text-green-600">{stats.active_users}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500">Students</h3>
                        <p className="text-2xl font-bold text-blue-600">{stats.students}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500">Instructors</h3>
                        <p className="text-2xl font-bold text-purple-600">{stats.instructors}</p>
                    </div>
                </div>
            )}

            {/* Header and Controls */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
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
                        className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Roles</option>
                        <option value="student">Students</option>
                        <option value="instructor">Instructors</option>
                        <option value="admin">Admins</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Courses
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Joined
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                            user.role === 'instructor' ? 'bg-blue-100 text-blue-800' :
                                            'bg-green-100 text-green-800'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.course_count || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(user)}
                                                className="text-yellow-600 hover:text-yellow-900"
                                            >
                                                {user.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <button
                                                onClick={() => handleResetPassword(user)}
                                                className="text-green-600 hover:text-green-900"
                                            >
                                                Reset
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user)}
                                                className="text-red-600 hover:text-red-900"
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
                {totalUsers > 20 && (
                    <div className="flex items-center justify-between mt-6">
                        <div className="text-sm text-gray-700">
                            Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalUsers)} of {totalUsers} results
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
                                onClick={() => setCurrentPage(Math.min(Math.ceil(totalUsers / 20), currentPage + 1))}
                                disabled={currentPage >= Math.ceil(totalUsers / 20)}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Create New User</h3>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={createForm.password}
                                    onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    value={createForm.role}
                                    onChange={(e) => setCreateForm({...createForm, role: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="student">Student</option>
                                    <option value="instructor">Instructor</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                                >
                                    Create User
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition"
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Edit User</h3>
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    value={editForm.role}
                                    onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                                        className="mr-2"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Active</span>
                                </label>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                                >
                                    Update User
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
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
