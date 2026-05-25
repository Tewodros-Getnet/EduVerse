import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const STATUS_COLORS = { published: 'bg-green-500/20 text-green-300', draft: 'bg-yellow-500/20 text-yellow-300', archived: 'bg-gray-500/20 text-gray-300' };
const DIFF_COLORS = { beginner: 'bg-blue-500/20 text-blue-300', intermediate: 'bg-orange-500/20 text-orange-300', advanced: 'bg-red-500/20 text-red-300' };

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
                <h1 className="text-2xl font-bold text-white">Course Management</h1>
                <p className="text-gray-400 text-sm mt-1">{courses.length} total courses</p>
            </div>

            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-purple-900/30">
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Course</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Instructor</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Difficulty</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Students</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Status</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-10 text-gray-500">Loading...</td></tr>
                        ) : courses.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-10 text-gray-500">No courses found</td></tr>
                        ) : courses.map(course => (
                            <tr key={course.id} className="border-b border-purple-900/20 hover:bg-[#1a1a35] transition">
                                <td className="px-5 py-3">
                                    <p className="text-sm font-medium text-white">{course.title}</p>
                                    <p className="text-xs text-gray-500">{course.category}</p>
                                </td>
                                <td className="px-5 py-3 text-sm text-gray-300">{course.instructor_name || '—'}</td>
                                <td className="px-5 py-3">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${DIFF_COLORS[course.difficulty_level] || 'bg-gray-500/20 text-gray-300'}`}>
                                        {course.difficulty_level || '—'}
                                    </span>
                                </td>
                                <td className="px-5 py-3 text-sm text-gray-300">{course.enrollment_count || 0}</td>
                                <td className="px-5 py-3">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[course.status]}`}>{course.status}</span>
                                </td>
                                <td className="px-5 py-3">
                                    <select
                                        value={course.status || 'draft'}
                                        onChange={e => updateStatus(course.id, e.target.value)}
                                        className="bg-[#1a1a35] border border-purple-900/40 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
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
