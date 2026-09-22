import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api/axios';

export default function InstructorAnalytics() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('all');
    const [performanceData, setPerformanceData] = useState(null);
    const [completionData, setCompletionData] = useState(null);
    const [studentData, setStudentData] = useState(null);
    const [contentData, setContentData] = useState(null);

    useEffect(() => {
        const loadDashboard = async () => {
            setLoading(true);
            await Promise.allSettled([
                fetchCourses(),
                fetchPerformanceData(),
                fetchCompletionData(),
                fetchContentData(),
            ]);
            setLoading(false);
        };

        loadDashboard();
    }, []);

    useEffect(() => {
        fetchStudentData();
    }, [selectedCourse]);

    const fetchCourses = async () => {
        try {
            const response = await api.get('/courses/instructor');
            setCourses(Array.isArray(response.data) ? response.data : response.data.courses || []);
        } catch (error) {
            toast.error('Failed to fetch courses');
        }
    };

    const fetchPerformanceData = async () => {
        try {
            const response = await api.get('/analytics/instructor/performance');
            setPerformanceData(response.data);
        } catch (error) {
            toast.error('Failed to fetch performance data');
        }
    };

    const fetchCompletionData = async () => {
        try {
            const response = await api.get('/analytics/instructor/completion-rates');
            setCompletionData(response.data);
        } catch (error) {
            toast.error('Failed to fetch completion data');
        }
    };

    const fetchStudentData = async () => {
        try {
            const params = selectedCourse !== 'all' ? { courseId: selectedCourse } : {};
            const response = await api.get('/analytics/instructor/student-performance', { params });
            setStudentData(response.data);
        } catch (error) {
            toast.error('Failed to fetch student data');
        }
    };

    const fetchContentData = async () => {
        try {
            const response = await api.get('/analytics/instructor/content-analytics');
            setContentData(response.data);
        } catch (error) {
            console.error('Failed to fetch content data:', error);
            toast.error('Failed to fetch content data');
            setContentData(null);
        }
    };

    // â”€â”€ Derived computed values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Overview card sub-labels -” computed from real data, not hardcoded
    const engagementLabel = (pct) => {
        if (pct >= 70) return { text: 'High engagement',     color: 'text-green-400' };
        if (pct >= 40) return { text: 'Moderate engagement', color: 'text-yellow-400' };
        return              { text: 'Low engagement',        color: 'text-red-400' };
    };

    const completionLabel = (pct) => {
        if (pct >= 70) return { text: 'Above average',  color: 'text-blue-400' };
        if (pct >= 40) return { text: 'Average',        color: 'text-yellow-400' };
        return              { text: 'Below average',   color: 'text-red-400' };
    };

    const formatNumber = (num) => {
        return new Intl.NumberFormat('en-US').format(Math.round(num || 0));
    };

    const formatCurrency = (num) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0);
    };

    const formatPercentage = (num) => {
        return `${Math.round(num || 0)}%`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Check if instructor has any courses
    const hasCourses = courses && courses.length > 0;
    const hasPerformanceData = performanceData && performanceData.student_engagement;
    const hasCompletionData = completionData && completionData.overall_completion;
    const hasStudentData = studentData && (studentData.top_performers?.length > 0 || studentData.struggling_students?.length > 0);
    const hasContentData = contentData && contentData.content_engagement_by_type;

    // Show empty state if no courses exist
    if (!hasCourses) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] space-y-4">
                <div className="w-20 h-20 bg-[var(--surface)] rounded-full flex items-center justify-center border-2 border-[var(--border)]">
                    <svg className="w-10 h-10 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-[var(--text)] mb-2">No Analytics Available</h2>
                    <p className="text-[var(--muted)] mb-6 max-w-md">
                        You haven't created any courses yet. Create your first course to start tracking analytics and student performance.
                    </p>
                    <button
                        onClick={() => window.location.href = '/instructor/courses'}
                        className="px-6 py-3 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition font-medium"
                    >
                        Create Your First Course
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-[var(--text)]">Analytics Dashboard</h1>
                <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl text-[var(--text)] text-sm"
                >
                    <option value="all">All Courses</option>
                    {courses.map(course => (
                        <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                </select>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 bg-[var(--surface)] border border-purple-900/30 rounded-xl p-1">
                {['overview', 'performance', 'completion', 'students', 'content'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${activeTab === tab
                                ? 'bg-[var(--accent-primary)] text-[var(--text)]'
                                : 'text-[var(--muted)] hover:text-[var(--text)]'
                            }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {!hasPerformanceData ? (
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center">
                            <p className="text-[var(--muted)]">No performance data available yet. Data will appear once students enroll in your courses.</p>
                        </div>
                    ) : (
                        <>
                            {/* Key Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Total Students */}
                        <div className="bg-[var(--surface)] border border-purple-900/30 rounded-xl p-4">
                            <h3 className="text-sm text-[var(--muted)] mb-2">Total Students</h3>
                            <p className="text-2xl font-bold text-[var(--text)]">{formatNumber(performanceData.student_engagement.total_students)}</p>
                            <p className="text-xs text-[var(--muted)] mt-1">
                                {formatNumber(performanceData.student_engagement.active_learners || 0)} active learners
                            </p>
                        </div>
                        {/* Avg Progress */}
                        <div className="bg-[var(--surface)] border border-purple-900/30 rounded-xl p-4">
                            <h3 className="text-sm text-[var(--muted)] mb-2">Avg Progress</h3>
                            <p className="text-2xl font-bold text-[var(--text)]">{formatPercentage(performanceData.student_engagement.avg_student_progress)}</p>
                            {(() => {
                                const e = engagementLabel(performanceData.student_engagement.avg_student_progress);
                                return <p className={`text-xs mt-1 ${e.color}`}>{e.text}</p>;
                            })()}
                        </div>
                        {/* Total Revenue */}
                        <div className="bg-[var(--surface)] border border-purple-900/30 rounded-xl p-4">
                            <h3 className="text-sm text-[var(--muted)] mb-2">Total Revenue</h3>
                            <p className="text-2xl font-bold text-[var(--text)]">{formatCurrency(performanceData.revenue_analytics.total_revenue)}</p>
                            <p className="text-xs text-[var(--muted)] mt-1">
                                {formatNumber(performanceData.revenue_analytics.total_enrollments || 0)} enrollments
                            </p>
                        </div>
                        {/* Course Completion -” use completionData when available, otherwise avg quiz score */}
                        <div className="bg-[var(--surface)] border border-purple-900/30 rounded-xl p-4">
                            <h3 className="text-sm text-[var(--muted)] mb-2">Course Completion</h3>
                            <p className="text-2xl font-bold text-[var(--text)]">
                                {completionData
                                    ? formatPercentage(completionData.overall_completion?.overall_completion_rate)
                                    : formatPercentage(performanceData.content_effectiveness.avg_quiz_performance)}
                            </p>
                            {completionData && (() => {
                                const c = completionLabel(completionData.overall_completion?.overall_completion_rate);
                                return <p className={`text-xs mt-1 ${c.color}`}>{c.text}</p>;
                            })()}
                        </div>
                    </div>

                    {/* Course Performance Overview */}
                    {performanceData.course_performance && performanceData.course_performance.length > 0 && (
                        <div className="bg-[var(--surface)] border border-purple-900/30 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Course Performance</h3>
                            <div className="space-y-4">
                                {performanceData.course_performance.slice(0, 5).map(course => (
                                    <div key={course.id} className="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-[var(--text)]">{course.title}</h4>
                                            <p className="text-sm text-[var(--muted)]">{course.enrollment_count} students enrolled</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-[var(--accent-primary)]">{formatPercentage(course.avg_progress)}</p>
                                            <p className="text-xs text-[var(--muted)]">avg progress</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                        </>
                    )}
                </div>
            )}

            {/* Performance Tab */}
            {activeTab === 'performance' && (
                <div className="space-y-6">
                    {!hasPerformanceData ? (
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center">
                            <p className="text-[var(--muted)]">No performance data available yet. Data will appear once students start engaging with your courses.</p>
                        </div>
                    ) : (
                        <>
                    {/* Student Engagement */}
                    <div className="bg-[var(--surface)] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Student Engagement</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-[var(--surface-2)] rounded-lg">
                                <div className="text-3xl font-bold text-green-400">{formatNumber(performanceData.student_engagement.highly_engaged)}</div>
                                <p className="text-sm text-[var(--muted)] mt-1">Highly Engaged (80%+)</p>
                            </div>
                            <div className="text-center p-4 bg-[var(--surface-2)] rounded-lg">
                                <div className="text-3xl font-bold text-yellow-400">{formatNumber(performanceData.student_engagement.moderately_engaged)}</div>
                                <p className="text-sm text-[var(--muted)] mt-1">Moderately Engaged (50-79%)</p>
                            </div>
                            <div className="text-center p-4 bg-[var(--surface-2)] rounded-lg">
                                <div className="text-3xl font-bold text-red-400">{formatNumber(performanceData.student_engagement.lowly_engaged)}</div>
                                <p className="text-sm text-[var(--muted)] mt-1">Low Engagement (&lt;50%)</p>
                            </div>
                        </div>
                    </div>

                    {/* Content Effectiveness */}
                    <div className="bg-[var(--surface)] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Content Effectiveness</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-[var(--surface-2)] rounded-lg">
                                <div className="text-3xl font-bold text-[var(--accent-primary)]">{formatNumber(performanceData.content_effectiveness.total_lessons)}</div>
                                <p className="text-sm text-[var(--muted)] mt-1">Total Lessons</p>
                            </div>
                            <div className="text-center p-4 bg-[var(--surface-2)] rounded-lg">
                                <div className="text-3xl font-bold text-[var(--accent-primary)]">{formatNumber(performanceData.content_effectiveness.completed_lessons)}</div>
                                <p className="text-sm text-[var(--muted)] mt-1">Completed</p>
                            </div>
                            <div className="text-center p-4 bg-[var(--surface-2)] rounded-lg">
                                <div className="text-3xl font-bold text-[var(--accent-primary)]">{formatPercentage(performanceData.content_effectiveness.avg_quiz_performance)}</div>
                                <p className="text-sm text-[var(--muted)] mt-1">Avg Quiz Score</p>
                            </div>
                            <div className="text-center p-4 bg-[var(--surface-2)] rounded-lg">
                                <div className="text-3xl font-bold text-[var(--accent-primary)]">{formatNumber(performanceData.content_effectiveness.total_assignments)}</div>
                                <p className="text-sm text-[var(--muted)] mt-1">Total Assignments</p>
                            </div>
                        </div>
                    </div>

                    {/* Revenue Analytics */}
                    <div className="bg-[var(--surface)] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Revenue Analytics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-[var(--surface-2)] rounded-lg">
                                <div className="text-3xl font-bold text-green-400">{formatCurrency(performanceData.revenue_analytics.total_revenue)}</div>
                                <p className="text-sm text-[var(--muted)] mt-1">Total Revenue</p>
                            </div>
                            <div className="text-center p-4 bg-[var(--surface-2)] rounded-lg">
                                <div className="text-3xl font-bold text-[var(--accent-primary)]">{formatCurrency(performanceData.revenue_analytics.revenue_per_enrollment)}</div>
                                <p className="text-sm text-[var(--muted)] mt-1">Revenue per Enrollment</p>
                            </div>
                            <div className="text-center p-4 bg-[var(--surface-2)] rounded-lg">
                                <div className="text-3xl font-bold text-blue-400">{formatNumber(performanceData.revenue_analytics.total_enrollments)}</div>
                                <p className="text-sm text-[var(--muted)] mt-1">Total Enrollments</p>
                            </div>
                        </div>
                    </div>
                        </>
                    )}
                </div>
            )}

            {/* Completion Tab */}
            {activeTab === 'completion' && (
                <div className="space-y-6">
                    {!hasCompletionData ? (
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center">
                            <p className="text-[var(--muted)]">No completion data available yet. Data will appear once students make progress in your courses.</p>
                        </div>
                    ) : (
                        <>
                    {/* Overall Completion */}
                    <div className="bg-[var(--surface)] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Overall Completion Rates</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-[var(--surface-2)] rounded-lg">
                                <div className="text-3xl font-bold text-[var(--accent-primary)]">{formatNumber(completionData.overall_completion.total_enrollments)}</div>
                                <p className="text-sm text-[var(--muted)] mt-1">Total Enrollments</p>
                            </div>
                            <div className="text-center p-4 bg-[var(--surface-2)] rounded-lg">
                                <div className="text-3xl font-bold text-green-400">{formatNumber(completionData.overall_completion.completed_courses)}</div>
                                <p className="text-sm text-[var(--muted)] mt-1">Completed Courses</p>
                            </div>
                            <div className="text-center p-4 bg-[var(--surface-2)] rounded-lg">
                                <div className="text-3xl font-bold text-blue-400">{formatPercentage(completionData.overall_completion.overall_completion_rate)}</div>
                                <p className="text-sm text-[var(--muted)] mt-1">Completion Rate</p>
                            </div>
                            <div className="text-center p-4 bg-[var(--surface-2)] rounded-lg">
                                <div className="text-3xl font-bold text-[var(--accent-primary)]">{formatPercentage(completionData.overall_completion.avg_progress_percent)}</div>
                                <p className="text-sm text-[var(--muted)] mt-1">Avg Progress</p>
                            </div>
                        </div>
                    </div>

                    {/* Course Completion Breakdown */}
                    <div className="bg-[var(--surface)] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Course Completion Breakdown</h3>
                        <div className="space-y-3">
                            {completionData.course_completion_breakdown.map(course => (
                                <div key={course.id} className="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-[var(--text)]">{course.title}</h4>
                                        <p className="text-sm text-[var(--muted)]">{course.enrollments} enrolled • {course.completions} completed</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="font-bold text-[var(--accent-primary)]">{formatPercentage(course.completion_rate)}</p>
                                            <p className="text-xs text-[var(--muted)]">completion rate</p>
                                        </div>
                                        <div className="w-32 bg-gray-700 rounded-full h-2">
                                            <div
                                                className="bg-purple-500 h-2 rounded-full"
                                                style={{ width: `${course.completion_rate}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Content Type Completion */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-[var(--surface)] border border-purple-900/30 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Lesson Completion</h3>
                            {completionData.lesson_completion_rates.map((rate, index) => (
                                <div key={index} className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-[var(--muted)]">{rate.course_title}</span>
                                    <span className="text-sm font-bold text-[var(--accent-primary)]">{formatPercentage(rate.lesson_completion_rate)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-[var(--surface)] border border-purple-900/30 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Quiz Pass Rates</h3>
                            {completionData.quiz_completion_rates.map((rate, index) => (
                                <div key={index} className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-[var(--muted)]">{rate.course_title}</span>
                                    <span className="text-sm font-bold text-green-400">{formatPercentage(rate.quiz_pass_rate)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-[var(--surface)] border border-purple-900/30 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Assignment Submission</h3>
                            {completionData.assignment_completion_rates.map((rate, index) => (
                                <div key={index} className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-[var(--muted)]">{rate.course_title}</span>
                                    <span className="text-sm font-bold text-blue-400">{formatPercentage(rate.submission_rate)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                        </>
                    )}
                </div>
            )}

            {/* Students Tab */}
            {activeTab === 'students' && (
                <div className="space-y-6">
                    {!hasStudentData ? (
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center">
                            <p className="text-[var(--muted)]">No student data available yet. Data will appear once students enroll and engage with your courses.</p>
                        </div>
                    ) : (
                        <>
                    {/* Top Performers */}
                    <div className="bg-[var(--surface)] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Top Performers</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {studentData.top_performers.map((student, index) => (
                                <div key={student.id} className="flex items-center gap-4 p-3 bg-[var(--surface-2)] rounded-lg">
                                    <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden relative">
                                        {student.avatar_url
                                            ? <img src={student.avatar_url} alt={student.name} className="w-full h-full object-cover" />
                                            : <div className="w-full h-full bg-green-500/20 flex items-center justify-center">
                                                <span className="text-green-400 font-bold text-sm">{index + 1}</span>
                                              </div>
                                        }
                                        {student.avatar_url && (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-[var(--text)] text-xs font-bold">{index + 1}</div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-[var(--text)]">{student.name}</h4>
                                        <p className="text-sm text-[var(--muted)]">{student.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-400">{formatPercentage(student.avg_progress)}</p>
                                        <p className="text-xs text-[var(--muted)]">avg progress</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Struggling Students */}
                    <div className="bg-[var(--surface)] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Students Needing Attention</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {studentData.struggling_students.map((student, index) => (
                                <div key={student.id} className="flex items-center gap-4 p-3 bg-[var(--surface-2)] rounded-lg">
                                    <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden relative">
                                        {student.avatar_url
                                            ? <img src={student.avatar_url} alt={student.name} className="w-full h-full object-cover" />
                                            : <div className="w-full h-full bg-red-500/20 flex items-center justify-center">
                                                <span className="text-red-400 font-bold">!</span>
                                              </div>
                                        }
                                        {student.avatar_url && (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[var(--text)] text-xs font-bold">!</div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-[var(--text)]">{student.name}</h4>
                                        <p className="text-sm text-[var(--muted)]">{student.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-red-400">{formatPercentage(student.avg_progress)}</p>
                                        <p className="text-xs text-[var(--muted)]">avg progress</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Progress Distribution */}
                    <div className="bg-[var(--surface)] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Progress Distribution</h3>
                        <div className="space-y-3">
                            {studentData.progress_distribution.map((range, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--muted)] w-20">{range.progress_range}</span>
                                    <div className="flex-1 mx-4">
                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div
                                                className="bg-purple-500 h-2 rounded-full"
                                                style={{ width: `${range.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-24">
                                        <span className="text-sm font-bold text-[var(--text)]">{range.student_count}</span>
                                        <span className="text-sm text-[var(--muted)]">({formatPercentage(range.percentage)})</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                        </>
                    )}
                </div>
            )}

            {/* Content Tab */}
            {activeTab === 'content' && (
                <div className="space-y-6">
                    {!hasContentData ? (
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center">
                            <p className="text-[var(--muted)]">No content analytics available yet. Data will appear once you add lessons, quizzes, and assignments to your courses.</p>
                        </div>
                    ) : (
                        <>
                    {/* Content Engagement by Type */}
                    <div className="bg-[var(--surface)] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Content Engagement by Type</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {contentData.content_engagement_by_type.map((type, index) => (
                                <div key={index} className="text-center p-4 bg-[var(--surface-2)] rounded-lg">
                                    <div className="text-3xl font-bold text-[var(--accent-primary)]">{formatNumber(type.total_items)}</div>
                                    <p className="text-sm text-[var(--muted)] mt-1 capitalize">{type.content_type.replace('_', ' ')}</p>
                                    <div className="mt-2">
                                        <div className="text-lg font-bold text-green-400">{formatPercentage(type.engagement_rate)}</div>
                                        <p className="text-xs text-[var(--muted)]">engagement rate</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Performing Lessons */}
                    <div className="bg-[var(--surface)] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Top Performing Lessons</h3>
                        <div className="space-y-3">
                            {contentData.lesson_analytics.slice(0, 5).map((lesson, index) => (
                                <div key={lesson.id} className="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-[var(--text)]">{lesson.title}</h4>
                                        <p className="text-sm text-[var(--muted)]">{lesson.attempts} attempts • {lesson.completions} completed</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-400">{formatPercentage(lesson.completion_rate)}</p>
                                        <p className="text-xs text-[var(--muted)]">completion rate</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quiz Performance */}
                    <div className="bg-[var(--surface)] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Quiz Performance</h3>
                        <div className="space-y-3">
                            {contentData.quiz_analytics.slice(0, 5).map((quiz, index) => (
                                <div key={quiz.id} className="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-[var(--text)]">{quiz.title}</h4>
                                        <p className="text-sm text-[var(--muted)]">{quiz.attempts} attempts • {quiz.passes} passed</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-blue-400">{formatPercentage(quiz.pass_rate)}</p>
                                        <p className="text-xs text-[var(--muted)]">pass rate</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
