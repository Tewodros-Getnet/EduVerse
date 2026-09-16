import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const STATUS_COLORS = { published: 'bg-[var(--status-success)]/20 text-[var(--status-success)]', draft: 'bg-[var(--status-warning)]/20 text-[var(--status-warning)]', archived: 'bg-[var(--muted)]/20 text-[var(--muted)]' };
const DIFF_COLORS = { beginner: 'bg-[var(--status-info)]/20 text-[var(--status-info)]', intermediate: 'bg-[var(--status-warning)]/20 text-[var(--status-warning)]', advanced: 'bg-[var(--status-error)]/20 text-[var(--status-error)]' };

export default function Courses() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/courses');
            setCourses(res.data.courses);
        } catch { toast.error('Failed to load courses'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchCourses(); }, []);

    const updateStatus = async (id, status) => {
        try {
            await api.patch(`/admin/courses/${id}/status`, { status });
            toast.success('Course status updated');
            fetchCourses();
        } catch { toast.error('Failed to update course'); }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[var(--text)]">Course Management</h1>
                <p className="text-[var(--muted)] text-sm mt-1">{courses.length} total courses</p>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--border)]">
                            <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--muted)] uppercase">Course</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--muted)] uppercase">Instructor</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--muted)] uppercase">Difficulty</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--muted)] uppercase">Students</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--muted)] uppercase">Status</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--muted)] uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-10 text-[var(--muted)]">Loading...</td></tr>
                        ) : courses.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-10 text-[var(--muted)]">No courses found</td></tr>
                        ) : courses.map(course => (
                            <tr key={course.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition">
                                <td className="px-5 py-3">
                                    <p className="text-sm font-medium text-[var(--text)]">{course.title}</p>
                                    <p className="text-xs text-[var(--muted)]">{course.category}</p>
                                </td>
                                <td className="px-5 py-3 text-sm text-[var(--muted)]">{course.instructor_name || '—'}</td>
                                <td className="px-5 py-3">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${DIFF_COLORS[course.difficulty_level] || 'bg-gray-500/20 text-[var(--muted)]'}`}>
                                        {course.difficulty_level || '—'}
                                    </span>
                                </td>
                                <td className="px-5 py-3 text-sm text-[var(--muted)]">{course.enrollment_count || 0}</td>
                                <td className="px-5 py-3">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[course.status]}`}>{course.status}</span>
                                </td>
                                <td className="px-5 py-3">
                                    <select
                                        value={course.status || 'draft'}
                                        onChange={e => updateStatus(course.id, e.target.value)}
                                        className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--text)] focus:outline-none"
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="published">Published</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}




