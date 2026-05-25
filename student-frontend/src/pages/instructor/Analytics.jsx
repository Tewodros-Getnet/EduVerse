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
                fetchStudentData(),
                fetchContentData(),
            ]);
            setLoading(false);
        };

        loadDashboard();
    }, []);

    useEffect(() => {
        if (selectedCourse !== 'all') {
            fetchStudentData();
        } else {
            fetchStudentData();
        }
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

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
                <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="px-4 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-white text-sm"
                >
                    <option value="all">All Courses</option>
                    {courses.map(course => (
                        <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                </select>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 bg-[#12122a] border border-purple-900/30 rounded-xl p-1">
                {['overview', 'performance', 'completion', 'students', 'content'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${activeTab === tab
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && performanceData && (
                <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-[#12122a] border border-purple-900/30 rounded-xl p-4">
                            <h3 className="text-sm text-gray-400 mb-2">Total Students</h3>
                            <p className="text-2xl font-bold text-white">{formatNumber(performanceData.student_engagement.total_students)}</p>
                            <p className="text-xs text-green-400 mt-1">+12% from last month</p>
                        </div>
                        <div className="bg-[#12122a] border border-purple-900/30 rounded-xl p-4">
                            <h3 className="text-sm text-gray-400 mb-2">Avg Progress</h3>
                            <p className="text-2xl font-bold text-white">{formatPercentage(performanceData.student_engagement.avg_student_progress)}</p>
                            <p className="text-xs text-yellow-400 mt-1">Moderate engagement</p>
                        </div>
                        <div className="bg-[#12122a] border border-purple-900/30 rounded-xl p-4">
                            <h3 className="text-sm text-gray-400 mb-2">Total Revenue</h3>
                            <p className="text-2xl font-bold text-white">{formatCurrency(performanceData.revenue_analytics.total_revenue)}</p>
                            <p className="text-xs text-green-400 mt-1">+8% from last month</p>
                        </div>
                        <div className="bg-[#12122a] border border-purple-900/30 rounded-xl p-4">
                            <h3 className="text-sm text-gray-400 mb-2">Course Completion</h3>
                            <p className="text-2xl font-bold text-white">{formatPercentage(performanceData.content_effectiveness.avg_quiz_performance)}</p>
                            <p className="text-xs text-blue-400 mt-1">Above average</p>
                        </div>
                    </div>

                    {/* Course Performance Overview */}
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Course Performance</h3>
                        <div className="space-y-4">
                            {performanceData.course_performance.slice(0, 5).map(course => (
                                <div key={course.id} className="flex items-center justify-between p-3 bg-[#1a1a35] rounded-lg">
                                    <div>
                                        <h4 className="font-medium text-white">{course.title}</h4>
                                        <p className="text-sm text-gray-400">{course.enrollment_count} students enrolled</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-purple-400">{formatPercentage(course.avg_progress)}</p>
                                        <p className="text-xs text-gray-400">avg progress</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Performance Tab */}
            {activeTab === 'performance' && performanceData && (
                <div className="space-y-6">
                    {/* Student Engagement */}
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Student Engagement</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-[#1a1a35] rounded-lg">
                                <div className="text-3xl font-bold text-green-400">{formatNumber(performanceData.student_engagement.highly_engaged)}</div>
                                <p className="text-sm text-gray-400 mt-1">Highly Engaged (80%+)</p>
                            </div>
                            <div className="text-center p-4 bg-[#1a1a35] rounded-lg">
                                <div className="text-3xl font-bold text-yellow-400">{formatNumber(performanceData.student_engagement.moderately_engaged)}</div>
                                <p className="text-sm text-gray-400 mt-1">Moderately Engaged (50-79%)</p>
                            </div>
                            <div className="text-center p-4 bg-[#1a1a35] rounded-lg">
                                <div className="text-3xl font-bold text-red-400">{formatNumber(performanceData.student_engagement.lowly_engaged)}</div>
                                <p className="text-sm text-gray-400 mt-1">Low Engagement (&lt;50%)</p>
                            </div>
                        </div>
                    </div>

                    {/* Content Effectiveness */}
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Content Effectiveness</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-[#1a1a35] rounded-lg">
                                <div className="text-3xl font-bold text-purple-400">{formatNumber(performanceData.content_effectiveness.total_lessons)}</div>
                                <p className="text-sm text-gray-400 mt-1">Total Lessons</p>
                            </div>
                            <div className="text-center p-4 bg-[#1a1a35] rounded-lg">
                                <div className="text-3xl font-bold text-purple-400">{formatNumber(performanceData.content_effectiveness.completed_lessons)}</div>
                                <p className="text-sm text-gray-400 mt-1">Completed</p>
                            </div>
                            <div className="text-center p-4 bg-[#1a1a35] rounded-lg">
                                <div className="text-3xl font-bold text-purple-400">{formatPercentage(performanceData.content_effectiveness.avg_quiz_performance)}</div>
                                <p className="text-sm text-gray-400 mt-1">Avg Quiz Score</p>
                            </div>
                            <div className="text-center p-4 bg-[#1a1a35] rounded-lg">
                                <div className="text-3xl font-bold text-purple-400">{formatNumber(performanceData.content_effectiveness.total_assignments)}</div>
                                <p className="text-sm text-gray-400 mt-1">Total Assignments</p>
                            </div>
                        </div>
                    </div>

                    {/* Revenue Analytics */}
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Revenue Analytics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-[#1a1a35] rounded-lg">
                                <div className="text-3xl font-bold text-green-400">{formatCurrency(performanceData.revenue_analytics.total_revenue)}</div>
                                <p className="text-sm text-gray-400 mt-1">Total Revenue</p>
                            </div>
                            <div className="text-center p-4 bg-[#1a1a35] rounded-lg">
                                <div className="text-3xl font-bold text-purple-400">{formatCurrency(performanceData.revenue_analytics.revenue_per_enrollment)}</div>
                                <p className="text-sm text-gray-400 mt-1">Revenue per Enrollment</p>
                            </div>
                            <div className="text-center p-4 bg-[#1a1a35] rounded-lg">
                                <div className="text-3xl font-bold text-blue-400">{formatNumber(performanceData.revenue_analytics.total_enrollments)}</div>
                                <p className="text-sm text-gray-400 mt-1">Total Enrollments</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Completion Tab */}
            {activeTab === 'completion' && completionData && (
                <div className="space-y-6">
                    {/* Overall Completion */}
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Overall Completion Rates</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-[#1a1a35] rounded-lg">
                                <div className="text-3xl font-bold text-purple-400">{formatNumber(completionData.overall_completion.total_enrollments)}</div>
                                <p className="text-sm text-gray-400 mt-1">Total Enrollments</p>
                            </div>
                            <div className="text-center p-4 bg-[#1a1a35] rounded-lg">
                                <div className="text-3xl font-bold text-green-400">{formatNumber(completionData.overall_completion.completed_courses)}</div>
                                <p className="text-sm text-gray-400 mt-1">Completed Courses</p>
                            </div>
                            <div className="text-center p-4 bg-[#1a1a35] rounded-lg">
                                <div className="text-3xl font-bold text-blue-400">{formatPercentage(completionData.overall_completion.overall_completion_rate)}</div>
                                <p className="text-sm text-gray-400 mt-1">Completion Rate</p>
                            </div>
                            <div className="text-center p-4 bg-[#1a1a35] rounded-lg">
                                <div className="text-3xl font-bold text-purple-400">{formatPercentage(completionData.overall_completion.avg_progress_percent)}</div>
                                <p className="text-sm text-gray-400 mt-1">Avg Progress</p>
                            </div>
                        </div>
                    </div>

                    {/* Course Completion Breakdown */}
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Course Completion Breakdown</h3>
                        <div className="space-y-3">
                            {completionData.course_completion_breakdown.map(course => (
                                <div key={course.id} className="flex items-center justify-between p-3 bg-[#1a1a35] rounded-lg">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-white">{course.title}</h4>
                                        <p className="text-sm text-gray-400">{course.enrollments} enrolled • {course.completions} completed</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="font-bold text-purple-400">{formatPercentage(course.completion_rate)}</p>
                                            <p className="text-xs text-gray-400">completion rate</p>
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
                        <div className="bg-[#12122a] border border-purple-900/30 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Lesson Completion</h3>
                            {completionData.lesson_completion_rates.map((rate, index) => (
                                <div key={index} className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-400">{rate.course_title}</span>
                                    <span className="text-sm font-bold text-purple-400">{formatPercentage(rate.lesson_completion_rate)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-[#12122a] border border-purple-900/30 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Quiz Pass Rates</h3>
                            {completionData.quiz_completion_rates.map((rate, index) => (
                                <div key={index} className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-400">{rate.course_title}</span>
                                    <span className="text-sm font-bold text-green-400">{formatPercentage(rate.quiz_pass_rate)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-[#12122a] border border-purple-900/30 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Assignment Submission</h3>
                            {completionData.assignment_completion_rates.map((rate, index) => (
                                <div key={index} className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-400">{rate.course_title}</span>
                                    <span className="text-sm font-bold text-blue-400">{formatPercentage(rate.submission_rate)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Students Tab */}
            {activeTab === 'students' && studentData && (
                <div className="space-y-6">
                    {/* Top Performers */}
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Top Performers</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {studentData.top_performers.map((student, index) => (
                                <div key={student.id} className="flex items-center gap-4 p-3 bg-[#1a1a35] rounded-lg">
                                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                                        <span className="text-green-400 font-bold">{index + 1}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-white">{student.name}</h4>
                                        <p className="text-sm text-gray-400">{student.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-400">{formatPercentage(student.avg_progress)}</p>
                                        <p className="text-xs text-gray-400">avg progress</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Struggling Students */}
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Students Needing Attention</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {studentData.struggling_students.map((student, index) => (
                                <div key={student.id} className="flex items-center gap-4 p-3 bg-[#1a1a35] rounded-lg">
                                    <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                                        <span className="text-red-400 font-bold">!</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-white">{student.name}</h4>
                                        <p className="text-sm text-gray-400">{student.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-red-400">{formatPercentage(student.avg_progress)}</p>
                                        <p className="text-xs text-gray-400">avg progress</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Progress Distribution */}
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Progress Distribution</h3>
                        <div className="space-y-3">
                            {studentData.progress_distribution.map((range, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-400 w-20">{range.progress_range}</span>
                                    <div className="flex-1 mx-4">
                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div
                                                className="bg-purple-500 h-2 rounded-full"
                                                style={{ width: `${range.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-24">
                                        <span className="text-sm font-bold text-white">{range.student_count}</span>
                                        <span className="text-sm text-gray-400">({formatPercentage(range.percentage)})</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Content Tab */}
            {activeTab === 'content' && contentData && (
                <div className="space-y-6">
                    {/* Content Engagement by Type */}
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Content Engagement by Type</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {contentData.content_engagement_by_type.map((type, index) => (
                                <div key={index} className="text-center p-4 bg-[#1a1a35] rounded-lg">
                                    <div className="text-3xl font-bold text-purple-400">{formatNumber(type.total_items)}</div>
                                    <p className="text-sm text-gray-400 mt-1 capitalize">{type.content_type.replace('_', ' ')}</p>
                                    <div className="mt-2">
                                        <div className="text-lg font-bold text-green-400">{formatPercentage(type.engagement_rate)}</div>
                                        <p className="text-xs text-gray-400">engagement rate</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Performing Lessons */}
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Top Performing Lessons</h3>
                        <div className="space-y-3">
                            {contentData.lesson_analytics.slice(0, 5).map((lesson, index) => (
                                <div key={lesson.id} className="flex items-center justify-between p-3 bg-[#1a1a35] rounded-lg">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-white">{lesson.title}</h4>
                                        <p className="text-sm text-gray-400">{lesson.attempts} attempts • {lesson.completions} completed</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-400">{formatPercentage(lesson.completion_rate)}</p>
                                        <p className="text-xs text-gray-400">completion rate</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quiz Performance */}
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Quiz Performance</h3>
                        <div className="space-y-3">
                            {contentData.quiz_analytics.slice(0, 5).map((quiz, index) => (
                                <div key={quiz.id} className="flex items-center justify-between p-3 bg-[#1a1a35] rounded-lg">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-white">{quiz.title}</h4>
                                        <p className="text-sm text-gray-400">{quiz.attempts} attempts • {quiz.passes} passed</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-blue-400">{formatPercentage(quiz.pass_rate)}</p>
                                        <p className="text-xs text-gray-400">pass rate</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
