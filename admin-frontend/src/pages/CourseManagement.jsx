import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function CourseManagement() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [instructorFilter, setInstructorFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCourses, setTotalCourses] = useState(0);
    const [stats, setStats] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [courseDetails, setCourseDetails] = useState(null);

    useEffect(() => {
        fetchCourses();
        fetchStats();
    }, [currentPage, statusFilter, search, instructorFilter]);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: currentPage,
                limit: 20,
                ...(statusFilter && { status: statusFilter }),
                ...(search && { search }),
                ...(instructorFilter && { instructor_id: instructorFilter })
            });

            const response = await api.get(`/courses/admin/all?${params}`);
            setCourses(response.data.courses);
            setTotalCourses(response.data.total);
        } catch (error) {
            toast.error('Failed to fetch courses');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get('/courses/admin/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats');
        }
    };

    const handleApproveCourse = async (courseId) => {
        try {
            await api.post(`/courses/admin/${courseId}/approve`);
            toast.success('Course approved successfully');
            fetchCourses();
            fetchStats();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to approve course');
        }
    };

    const handleRejectCourse = async () => {
        if (!selectedCourse || !rejectReason.trim()) {
            toast.error('Please provide a rejection reason');
            return;
        }

        try {
            await api.post(`/courses/admin/${selectedCourse.id}/reject`, { reason: rejectReason });
            toast.success('Course rejected successfully');
            setShowRejectModal(false);
            setSelectedCourse(null);
            setRejectReason('');
            fetchCourses();
            fetchStats();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to reject course');
        }
    };

    const handleDeleteCourse = async (course) => {
        if (!window.confirm(`Are you sure you want to delete "${course.title}"?`)) return;
        
        try {
            await api.delete(`/courses/admin/${course.id}`);
            toast.success('Course deleted successfully');
            fetchCourses();
            fetchStats();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete course');
        }
    };

    const openRejectModal = (course) => {
        setSelectedCourse(course);
        setShowRejectModal(true);
    };

    const openDetailsModal = async (course) => {
        try {
            const response = await api.get(`/courses/admin/${course.id}/details`);
            setCourseDetails(response.data);
            setShowDetailsModal(true);
        } catch (error) {
            toast.error('Failed to fetch course details');
        }
    };

    if (loading && courses.length === 0) {
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
                        <h3 className="text-sm font-medium text-gray-500">Total Courses</h3>
                        <p className="text-2xl font-bold text-gray-900">{stats.total_courses}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500">Published</h3>
                        <p className="text-2xl font-bold text-green-600">{stats.published_courses}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500">Pending Approval</h3>
                        <p className="text-2xl font-bold text-yellow-600">{stats.pending_courses}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500">Total Enrollments</h3>
                        <p className="text-2xl font-bold text-blue-600">{stats.total_enrollments}</p>
                    </div>
                </div>
            )}

            {/* Header and Controls */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Course Management</h2>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                    <input
                        type="text"
                        placeholder="Search courses..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Status</option>
                        <option value="published">Published</option>
                        <option value="pending">Pending</option>
                        <option value="rejected">Rejected</option>
                        <option value="draft">Draft</option>
                    </select>
                </div>

                {/* Courses Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Course
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Instructor
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Enrollments
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Progress
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {courses.map((course) => (
                                <tr key={course.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{course.title}</div>
                                            <div className="text-sm text-gray-500">{course.category}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{course.instructor_name}</div>
                                            <div className="text-sm text-gray-500">{course.instructor_email}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            course.status === 'published' ? 'bg-green-100 text-green-800' :
                                            course.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            course.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {course.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {course.enrollment_count || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {course.avg_progress ? `${Math.round(course.avg_progress)}%` : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(course.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => openDetailsModal(course)}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                View
                                            </button>
                                            {course.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleApproveCourse(course.id)}
                                                        className="text-green-600 hover:text-green-900"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => openRejectModal(course)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => handleDeleteCourse(course)}
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
                {totalCourses > 20 && (
                    <div className="flex items-center justify-between mt-6">
                        <div className="text-sm text-gray-700">
                            Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalCourses)} of {totalCourses} results
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
                                onClick={() => setCurrentPage(Math.min(Math.ceil(totalCourses / 20), currentPage + 1))}
                                disabled={currentPage >= Math.ceil(totalCourses / 20)}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Reject Modal */}
            {showRejectModal && selectedCourse && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Reject Course</h3>
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2">Course: <span className="font-medium">{selectedCourse.title}</span></p>
                            <p className="text-sm text-gray-600">Instructor: <span className="font-medium">{selectedCourse.instructor_name}</span></p>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason</label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Please provide a reason for rejection..."
                                required
                            />
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={handleRejectCourse}
                                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
                            >
                                Reject Course
                            </button>
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setSelectedCourse(null);
                                    setRejectReason('');
                                }}
                                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Course Details Modal */}
            {showDetailsModal && courseDetails && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Course Details</h3>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Course Info */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-2">Course Information</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500">Title:</span>
                                        <span className="ml-2 font-medium">{courseDetails.course.title}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Status:</span>
                                        <span className="ml-2 font-medium">{courseDetails.course.status}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Category:</span>
                                        <span className="ml-2 font-medium">{courseDetails.course.category}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Difficulty:</span>
                                        <span className="ml-2 font-medium">{courseDetails.course.difficulty_level}</span>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <span className="text-gray-500">Description:</span>
                                    <p className="mt-1 text-sm">{courseDetails.course.description}</p>
                                </div>
                            </div>

                            {/* Enrollments */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-2">Enrollments ({courseDetails.enrollments.length})</h4>
                                <div className="max-h-40 overflow-y-auto">
                                    {courseDetails.enrollments.map((enrollment) => (
                                        <div key={enrollment.id} className="flex justify-between items-center py-2 border-b">
                                            <div>
                                                <span className="text-sm font-medium">{enrollment.student_name}</span>
                                                <span className="text-xs text-gray-500 ml-2">{enrollment.student_email}</span>
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-gray-500">Progress:</span>
                                                <span className="ml-1 font-medium">{enrollment.progress_percent || 0}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Lessons */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-2">Lessons ({courseDetails.lessons.length})</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {courseDetails.lessons.map((lesson) => (
                                        <div key={lesson.id} className="flex justify-between items-center py-2 border-b text-sm">
                                            <span>{lesson.title}</span>
                                            <span className="text-gray-500">{lesson.quiz_count} quizzes</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Assignments */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-2">Assignments ({courseDetails.assignments.length})</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {courseDetails.assignments.map((assignment) => (
                                        <div key={assignment.id} className="flex justify-between items-center py-2 border-b text-sm">
                                            <span>{assignment.title}</span>
                                            <span className="text-gray-500">{assignment.submission_count} submissions</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Assessments */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-2">Assessments ({courseDetails.assessments.length})</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {courseDetails.assessments.map((assessment) => (
                                        <div key={assessment.id} className="flex justify-between items-center py-2 border-b text-sm">
                                            <span>{assessment.title}</span>
                                            <span className="text-gray-500">{assessment.result_count} results</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
