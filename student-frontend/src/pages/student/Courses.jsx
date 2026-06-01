import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const DIFF_COLORS = { beginner: 'text-blue-400', intermediate: 'text-orange-400', advanced: 'text-red-400' };

export default function Courses() {
    const [courses, setCourses] = useState([]);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState('');
    const [difficulty, setDifficulty] = useState('');
    const [category, setCategory] = useState('');
    const [priceFilter, setPriceFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [loading, setLoading] = useState(true);
    const [enrollingCourse, setEnrollingCourse] = useState(null);
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
        fetchCourses();
        fetchEnrolledCourses();
    }, [search, difficulty, category, priceFilter, sortBy]);

    useEffect(() => {
        // Load distinct categories from published courses
        api.get('/courses', { params: { limit: 100 } })
            .then(res => {
                const cats = [...new Set((res.data.courses || []).map(c => c.category).filter(Boolean))].sort();
                setCategories(cats);
            })
            .catch(() => {});
    }, []);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const params = { search, difficulty, category, sort: sortBy };
            if (priceFilter !== 'all') {
                params.price_filter = priceFilter;
            }
            const response = await api.get('/courses', { params });
            setCourses(response.data.courses || []);
        } catch (error) {
            toast.error('Failed to load courses');
        } finally {
            setLoading(false);
        }
    };

    const fetchEnrolledCourses = async () => {
        try {
            const response = await api.get('/courses/enrolled');
            setEnrolledCourses(response.data.courses || []);
        } catch (error) {
            // Don't show error for enrolled courses, might not be logged in yet
        }
    };

    const enroll = async (courseId) => {
        setEnrollingCourse(courseId);
        try {
            await api.post(`/courses/${courseId}/enroll`);
            toast.success('Enrolled successfully!');
            // Update the course state to show as enrolled
            setCourses(prev => prev.map(course =>
                course.id === courseId ? { ...course, is_enrolled: true } : course
            ));
            // Refresh enrolled courses
            fetchEnrolledCourses();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Enrollment failed');
        } finally {
            setEnrollingCourse(null);
        }
    };

    const unenroll = (courseId) => {
        openConfirm({
            title: 'Unenroll from course',
            message: 'Are you sure you want to unenroll from this course?',
            confirmLabel: 'Unenroll',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                try {
                    await api.post(`/courses/${courseId}/unenroll`);
                    toast.success('Unenrolled successfully!');
                    setCourses(prev => prev.map(course =>
                        course.id === courseId ? { ...course, is_enrolled: false } : course
                    ));
                    fetchEnrolledCourses();
                } catch (err) {
                    toast.error(err.response?.data?.error || 'Unenrollment failed');
                } finally {
                    closeConfirm();
                }
            }
        });
    };

    const isEnrolled = (courseId) => {
        return enrolledCourses.some(course => course.id === courseId) ||
            courses.some(course => course.id === courseId && course.is_enrolled);
    };

    const getProgressColor = (progress) => {
        if (progress >= 80) return 'bg-green-500';
        if (progress >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Browse Courses</h1>
                <div className="text-sm text-gray-400">
                    {courses.length} courses found
                </div>
            </div>

            {/* Enhanced Filters */}
            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search courses..."
                        className="bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                    />
                    <select
                        value={difficulty}
                        onChange={e => setDifficulty(e.target.value)}
                        className="bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500 text-sm"
                    >
                        <option value="">All Levels</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500 text-sm"
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <select
                        value={priceFilter}
                        onChange={e => setPriceFilter(e.target.value)}
                        className="bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500 text-sm"
                    >
                        <option value="all">All Prices</option>
                        <option value="free">Free</option>
                        <option value="paid">Paid</option>
                    </select>
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500 text-sm"
                    >
                        <option value="newest">Newest</option>
                        <option value="popular">Most Popular</option>
                        <option value="rating">Highest Rated</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {courses.map(course => {
                        const enrolled = isEnrolled(course.id);
                        return (
                            <div key={course.id} className="bg-[#12122a] border border-purple-900/30 rounded-2xl overflow-hidden hover:border-purple-500/50 transition">
                                <div className="h-40 bg-gradient-to-br from-purple-700 to-pink-700 relative">
                                    {course.thumbnail_url && (
                                        <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                                    )}
                                    {enrolled && course.progress_percent !== undefined && (
                                        <div className="absolute top-2 right-2 bg-black/50 rounded-full px-2 py-1">
                                            <span className="text-xs text-white">{Math.round(course.progress_percent)}% complete</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-xs font-medium capitalize ${DIFF_COLORS[course.difficulty_level] || 'text-gray-400'}`}>
                                            {course.difficulty_level}
                                        </span>
                                        <span className="text-xs text-gray-500">{course.enrollment_count || 0} students</span>
                                    </div>
                                    <h3 className="font-semibold text-white mb-1">{course.title}</h3>
                                    <p className="text-xs text-gray-400 mb-3 line-clamp-2">{course.description}</p>
                                    <p className="text-xs text-gray-500 mb-3">by {course.instructor_name}</p>

                                    {/* Progress bar for enrolled courses */}
                                    {enrolled && course.progress_percent !== undefined && (
                                        <div className="mb-3">
                                            <div className="w-full bg-gray-700 rounded-full h-2">
                                                <div
                                                    className={`${getProgressColor(course.progress_percent)} h-2 rounded-full transition-all duration-300`}
                                                    style={{ width: `${course.progress_percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <Link
                                            to={`/student/courses/${course.id}`}
                                            className="flex-1 py-2 text-center text-sm bg-[#1a1a35] border border-purple-900/40 rounded-xl text-white hover:border-purple-500 transition"
                                        >
                                            {enrolled ? 'Continue' : 'View'}
                                        </Link>
                                        {enrolled ? (
                                            <button
                                                onClick={() => unenroll(course.id)}
                                                className="px-4 py-2 text-sm bg-red-600/20 border border-red-600/40 rounded-xl text-red-400 hover:bg-red-600/30 transition"
                                            >
                                                Unenroll
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => enroll(course.id)}
                                                disabled={enrollingCourse === course.id}
                                                className="flex-1 py-2 text-sm bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white font-medium hover:opacity-90 transition disabled:opacity-50"
                                            >
                                                {enrollingCourse === course.id ? 'Enrolling...' :
                                                    course.price > 0 ? `$${course.price}` : 'Free'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {courses.length === 0 && !loading && (
                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-8 text-center">
                    <p className="text-gray-400 mb-4">No courses found matching your criteria.</p>
                    <button
                        onClick={() => {
                            setSearch('');
                            setDifficulty('');
                            setCategory('');
                            setPriceFilter('all');
                            setSortBy('newest');
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm hover:bg-purple-700 transition"
                    >
                        Clear Filters
                    </button>
                </div>
            )}

            <ConfirmModal
                open={confirmDialog.open}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel={confirmDialog.confirmLabel}
                cancelLabel={confirmDialog.cancelLabel}
                onConfirm={confirmDialog.onConfirm}
                onCancel={closeConfirm}
            />
        </div>
    );
}
