import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, BarChart3, Copy, Upload, Play, Book, Users, DollarSign, Clock } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';

export default function InstructorCourses() {
    const [courses, setCourses] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ title: '', description: '', difficulty_level: 'beginner', category: '', price: 0, duration_hours: 0, prerequisites: '' });
    const [saving, setSaving] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(null);
    const [publishingCourse, setPublishingCourse] = useState(null);
    const [filter, setFilter] = useState('all');
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        onConfirm: null
    });

    const openConfirm = ({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm }) => {
        setConfirmDialog({ open: true, title, message, confirmLabel, cancelLabel, onConfirm });
    };

    const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, open: false, onConfirm: null }));

    useEffect(() => {
        api.get('/courses/my/teaching').then(res => setCourses(res.data.courses || [])).catch(() => toast.error('Failed to load courses'));
    }, []);

    const createCourse = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return toast.error('Course title is required');
        setSaving(true);
        try {
            const res = await api.post('/courses', form);
            setCourses(prev => [res.data.course, ...prev]);
            setShowForm(false);
            setForm({ title: '', description: '', difficulty_level: 'beginner', category: '', price: 0, duration_hours: 0, prerequisites: '' });
            toast.success('✓ Course created successfully!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create course');
        } finally { setSaving(false); }
    };

    const updateCourse = async (e) => {
        e.preventDefault();
        if (!editingId || !form.title.trim()) return toast.error('Course title is required');
        setSaving(true);
        try {
            const res = await api.put(`/courses/${editingId}`, form);
            setCourses(prev => prev.map(c => c.id === editingId ? res.data.course : c));
            setEditingId(null);
            setForm({ title: '', description: '', difficulty_level: 'beginner', category: '', price: 0, duration_hours: 0, prerequisites: '' });
            toast.success('✓ Course updated successfully!');
            setShowForm(false);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update course');
        } finally { setSaving(false); }
    };

    const startEdit = (course) => {
        setEditingId(course.id);
        setForm({
            title: course.title,
            description: course.description,
            difficulty_level: course.difficulty_level,
            category: course.category,
            price: course.price || 0,
            duration_hours: course.duration_hours || 0,
            prerequisites: course.prerequisites || ''
        });
        setShowForm(true);
    };

    const publishCourse = async (courseId) => {
        setPublishingCourse(courseId);
        try {
            const res = await api.post(`/courses/${courseId}/publish`);
            setCourses(prev => prev.map(c => c.id === courseId ? res.data.course : c));
            toast.success('✓ Course published successfully!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to publish course');
        } finally {
            setPublishingCourse(null);
        }
    };

    const duplicateCourse = async (courseId, newTitle) => {
        try {
            const res = await api.post(`/courses/${courseId}/duplicate`, { new_title: newTitle });
            setCourses(prev => [res.data.course, ...prev]);
            toast.success('✓ Course duplicated successfully!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to duplicate course');
        }
    };

    const fetchAnalytics = async (courseId) => {
        try {
            const res = await api.get(`/courses/${courseId}/analytics`);
            setShowAnalytics(res.data);
        } catch (err) {
            toast.error('Failed to fetch analytics');
        }
    };

    const deleteCourse = (id) => {
        openConfirm({
            title: 'Delete course',
            message: 'Are you sure? This cannot be undone.',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                try {
                    await api.delete(`/courses/${id}`);
                    setCourses(prev => prev.filter(c => c.id !== id));
                    toast.success('✓ Course deleted');
                } catch {
                    toast.error('Failed to delete course');
                } finally {
                    closeConfirm();
                }
            }
        });
    };

    const getDifficultyColor = (level) => {
        switch (level) {
            case 'beginner': return 'from-green-500/20 to-green-500/10 border-green-500/30';
            case 'intermediate': return 'from-yellow-500/20 to-yellow-500/10 border-yellow-500/30';
            case 'advanced': return 'from-red-500/20 to-red-500/10 border-red-500/30';
            default: return 'from-purple-500/20 to-purple-500/10 border-purple-500/30';
        }
    };

    const getDifficultyBadgeColor = (level) => {
        switch (level) {
            case 'beginner': return 'bg-green-500/20 text-green-300 border border-green-500/30';
            case 'intermediate': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
            case 'advanced': return 'bg-red-500/20 text-red-300 border border-red-500/30';
            default: return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
        }
    };

    const filteredCourses = filter === 'all' ? courses : courses.filter(c => c.status === filter);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] to-[#1a1a2e] px-4 py-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                            My Courses
                        </h1>
                        <p className="text-gray-400 mt-2">Manage and create your courses</p>
                    </div>
                    <button
                        onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ title: '', description: '', difficulty_level: 'beginner', category: '', price: 0, duration_hours: 0, prerequisites: '' }); }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl text-white font-medium transition duration-200 shadow-lg hover:shadow-purple-500/25">
                        <Plus className="w-5 h-5" />
                        Create Course
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-3 mb-6 pb-4 border-b border-purple-900/30">
                    {['all', 'draft', 'published', 'archived'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm capitalize transition ${filter === f
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                }`}>
                            {f}
                        </button>
                    ))}
                </div>

                {/* Form */}
                {showForm && (
                    <div className="mb-8 bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-2xl p-8 backdrop-blur">
                        <h2 className="text-2xl font-bold text-white mb-6">{editingId ? '✏️ Edit Course' : '➕ Create New Course'}</h2>
                        <form onSubmit={editingId ? updateCourse : createCourse} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Course Title *</label>
                                <input
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    required
                                    placeholder="e.g., Advanced Web Development"
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    required
                                    rows={4}
                                    placeholder="Describe what students will learn..."
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition resize-none" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty Level</label>
                                    <select
                                        value={form.difficulty_level}
                                        onChange={e => setForm(f => ({ ...f, difficulty_level: e.target.value }))}
                                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition">
                                        <option value="beginner">🟢 Beginner</option>
                                        <option value="intermediate">🟡 Intermediate</option>
                                        <option value="advanced">🔴 Advanced</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                                    <input
                                        value={form.category}
                                        onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                        placeholder="e.g., Web Development"
                                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Price (USD)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-3 text-gray-400">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.price}
                                            onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                                            className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Duration (hours)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.duration_hours}
                                        onChange={e => setForm(f => ({ ...f, duration_hours: parseInt(e.target.value) || 0 }))}
                                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Prerequisites</label>
                                <textarea
                                    value={form.prerequisites}
                                    onChange={e => setForm(f => ({ ...f, prerequisites: e.target.value }))}
                                    rows={3}
                                    placeholder="List any required knowledge..."
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition resize-none" />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl text-white font-medium transition disabled:opacity-50 shadow-lg hover:shadow-purple-500/25">
                                    {saving ? '⏳ Saving...' : (editingId ? '✓ Update Course' : '✓ Create Course')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowForm(false); setEditingId(null); setForm({ title: '', description: '', difficulty_level: 'beginner', category: '', price: 0, duration_hours: 0, prerequisites: '' }); }}
                                    className="px-6 py-3 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-gray-400 hover:text-white font-medium transition">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Courses Grid */}
                {filteredCourses.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredCourses.map(course => (
                            <div
                                key={course.id}
                                className={`group bg-gradient-to-br ${getDifficultyColor(course.difficulty_level)} border rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/20 transition duration-300 overflow-hidden relative`}>
                                {/* Status Badge */}
                                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${course.status === 'published' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                                        course.status === 'archived' ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30' :
                                            'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                    }`}>
                                    {course.status === 'published' ? '📢 Published' : course.status === 'archived' ? '📦 Archived' : '📝 Draft'}
                                </div>

                                {/* Content */}
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text transition line-clamp-2">
                                            {course.title}
                                        </h3>
                                        <p className="text-sm text-gray-400 mt-2">{course.category}</p>
                                    </div>
                                    <p className="text-sm text-gray-300 line-clamp-3">{course.description}</p>

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-3 pt-4">
                                        <div className="bg-black/30 rounded-lg px-3 py-2">
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <Users className="w-4 h-4" />
                                                <span>{course.enrollment_count || 0} students</span>
                                            </div>
                                        </div>
                                        <div className="bg-black/30 rounded-lg px-3 py-2">
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <Clock className="w-4 h-4" />
                                                <span>{course.duration_hours || 0}h</span>
                                            </div>
                                        </div>
                                        {course.price > 0 && (
                                            <div className="bg-black/30 rounded-lg px-3 py-2">
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <DollarSign className="w-4 h-4" />
                                                    <span>${course.price}</span>
                                                </div>
                                            </div>
                                        )}
                                        <div className={`bg-black/30 rounded-lg px-3 py-2 text-xs font-medium ${getDifficultyBadgeColor(course.difficulty_level).split(' ')[0]}`}>
                                            <span className={getDifficultyBadgeColor(course.difficulty_level)}>
                                                {course.difficulty_level === 'beginner' ? '🟢' : course.difficulty_level === 'intermediate' ? '🟡' : '🔴'} {course.difficulty_level}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-2 pt-4 border-t border-black/20">
                                        <Link
                                            to={`/instructor/courses/${course.id}`}
                                            className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium text-center transition flex items-center justify-center gap-2">
                                            <Book className="w-4 h-4" />
                                            Manage
                                        </Link>
                                        <button
                                            onClick={() => startEdit(course)}
                                            className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/40 rounded-lg text-blue-300 text-sm font-medium transition">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => fetchAnalytics(course.id)}
                                            className="px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-600/40 rounded-lg text-cyan-300 text-sm font-medium transition">
                                            <BarChart3 className="w-4 h-4" />
                                        </button>
                                        {course.status === 'draft' && (
                                            <button
                                                onClick={() => publishCourse(course.id)}
                                                disabled={publishingCourse === course.id}
                                                className="px-3 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-600/40 rounded-lg text-green-300 text-sm font-medium transition disabled:opacity-50">
                                                {publishingCourse === course.id ? '⏳' : '📤'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                const newTitle = prompt('Enter title for duplicated course:', `${course.title} (Copy)`);
                                                if (newTitle) duplicateCourse(course.id, newTitle);
                                            }}
                                            className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-600/40 rounded-lg text-indigo-300 text-sm font-medium transition">
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => deleteCourse(course.id)}
                                            className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 rounded-lg text-red-300 text-sm font-medium transition">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-2xl p-12 text-center">
                        <div className="text-5xl mb-4">📚</div>
                        <p className="text-gray-400 text-lg mb-6">No {filter !== 'all' ? filter : ''} courses yet. Start creating!</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl text-white font-medium transition shadow-lg hover:shadow-purple-500/25">
                            <Plus className="w-5 h-5" />
                            Create Your First Course
                        </button>
                    </div>
                )}

                {/* Analytics Modal */}
                {showAnalytics && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-50 p-4">
                        <div className="bg-gradient-to-br from-[#0f0f1a] to-[#1a1a2e] border border-purple-500/30 rounded-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-white">📊 Course Analytics</h3>
                                <button
                                    onClick={() => setShowAnalytics(null)}
                                    className="text-gray-400 hover:text-white text-2xl transition">
                                    ←
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-gradient-to-br from-purple-900/20 to-purple-900/5 border border-purple-500/30 rounded-xl p-6">
                                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                                        <Users className="w-5 h-5" />
                                        Enrollment Statistics
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div className="bg-black/30 rounded-lg p-4">
                                            <p className="text-gray-400 text-sm mb-1">Total Enrollments</p>
                                            <p className="text-white text-2xl font-bold">{showAnalytics.enrollment_stats?.total_enrollments || 0}</p>
                                        </div>
                                        <div className="bg-black/30 rounded-lg p-4">
                                            <p className="text-gray-400 text-sm mb-1">Recent (30 days)</p>
                                            <p className="text-white text-2xl font-bold">{showAnalytics.enrollment_stats?.recent_enrollments || 0}</p>
                                        </div>
                                        <div className="bg-black/30 rounded-lg p-4">
                                            <p className="text-gray-400 text-sm mb-1">Avg Progress</p>
                                            <p className="text-white text-2xl font-bold">{Math.round(showAnalytics.enrollment_stats?.avg_progress || 0)}%</p>
                                        </div>
                                    </div>
                                </div>

                                {showAnalytics.revenue_stats?.total_revenue > 0 && (
                                    <div className="bg-gradient-to-br from-green-900/20 to-green-900/5 border border-green-500/30 rounded-xl p-6">
                                        <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                                            <DollarSign className="w-5 h-5" />
                                            Revenue
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-black/30 rounded-lg p-4">
                                                <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
                                                <p className="text-white text-2xl font-bold">${showAnalytics.revenue_stats?.total_revenue || 0}</p>
                                            </div>
                                            <div className="bg-black/30 rounded-lg p-4">
                                                <p className="text-gray-400 text-sm mb-1">Paying Students</p>
                                                <p className="text-white text-2xl font-bold">{showAnalytics.revenue_stats?.paying_students || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>            <ConfirmModal
                open={confirmDialog.open}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel={confirmDialog.confirmLabel}
                cancelLabel={confirmDialog.cancelLabel}
                onConfirm={confirmDialog.onConfirm}
                onCancel={closeConfirm}
            />        </div>
    );
}
