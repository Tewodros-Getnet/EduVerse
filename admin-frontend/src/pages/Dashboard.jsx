import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Dashboard() {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [animationsLoaded, setAnimationsLoaded] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        if (!loading && dashboardData) {
            // Trigger animations after data loads
            const timer = setTimeout(() => setAnimationsLoaded(true), 200);
            return () => clearTimeout(timer);
        }
    }, [loading, dashboardData]);

    const fetchDashboardData = async () => {
        try {
            const response = await api.get('/analytics/admin/dashboard');
            setDashboardData(response.data);
        } catch (error) {
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const { overview, top_courses, user_growth, course_growth } = dashboardData || {};

    const statCards = [
        {
            title: 'Total Users',
            value: overview?.total_users?.toLocaleString() || '0',
            change: `${overview?.active_users || 0} active`,
            icon: '',
            gradient: 'from-blue-500 to-cyan-400',
            subtitle: 'Active users'
        },

        {
            title: 'Courses',
            value: overview?.total_courses?.toLocaleString() || '0',
            change: `${overview?.published_courses || 0} published`,
            icon: '📚',
            gradient: 'from-green-500 to-emerald-400',
            subtitle: 'Published courses'
        },
        {
            title: 'Enrollments',
            value: overview?.total_enrollments?.toLocaleString() || '0',
            change: `${Math.round(overview?.avg_progress || 0)}% avg progress`,
            icon: '📈',
            gradient: 'from-purple-500 to-pink-500',
            subtitle: 'Average progress'
        },
        {
            title: 'Revenue',
            value: `$${(overview?.total_revenue || 0).toLocaleString()}`,
            change: `${overview?.recent_activity || 0} recent activities`,
            icon: '💰',
            gradient: 'from-orange-500 to-yellow-400',
            subtitle: 'Recent activity'
        },
    ];

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-gray-400 text-sm mt-1">Monitor platform health and activity</p>
            </div>

            {/* Stat Cards */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transform transition-all duration-1000 ${
                animationsLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}>
                {statCards.map((card, index) => (
                    <AnimatedStatCard key={card.title} card={card} index={index} />
                ))}
            </div>

            {/* Top Courses */}
            {top_courses && top_courses.length > 0 && (
                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Top Performing Courses</h2>
                    <div className="space-y-3">
                        {top_courses.map((course, index) => (
                            <div key={`${course.title}-${index}`} className="flex items-center justify-between p-3 bg-[#1a1a35] rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-medium text-sm">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-white">{course.title}</h4>
                                        <p className="text-sm text-gray-400">{course.students} students</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-white">{Math.round(course.avg_progress || 0)}%</p>
                                    <p className="text-sm text-gray-500">avg progress</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Growth Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Growth */}
                {user_growth && user_growth.length > 0 && (
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">User Growth (Last 6 Months)</h2>
                        <div className="space-y-2">
                            {user_growth.map((data) => (
                                <div key={data.month} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-400">
                                        {new Date(data.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-32 bg-[#1a1a35] rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full"
                                                style={{ width: `${Math.min((data.new_users / Math.max(...user_growth.map(u => u.new_users))) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium text-white w-12 text-right">
                                            {data.new_users}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Course Growth */}
                {course_growth && course_growth.length > 0 && (
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Course Growth (Last 6 Months)</h2>
                        <div className="space-y-2">
                            {course_growth.map((data, index) => (
                                <div key={`${data.month}-${index}`} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-400">
                                        {new Date(data.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-32 bg-[#1a1a35] rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-green-500 to-emerald-400 h-2 rounded-full"
                                                style={{ width: `${Math.min((data.new_courses / Math.max(...course_growth.map(c => c.new_courses))) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium text-white w-12 text-right">
                                            {data.new_courses}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                    to="/users"
                    className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl p-5 cursor-pointer hover:opacity-90 transition block text-white shadow-lg"
                >
                    <div className="text-3xl mb-3">👥</div>
                    <h3 className="text-lg font-bold">User management</h3>
                    <p className="text-sm text-white/70 mt-1">Manage students and instructors</p>
                </Link>
                <Link
                    to="/courses"
                    className="bg-gradient-to-br from-green-500 to-emerald-400 rounded-2xl p-5 cursor-pointer hover:opacity-90 transition block text-white shadow-lg"
                >
                    <div className="text-3xl mb-3">📚</div>
                    <h3 className="text-lg font-bold">Course management</h3>
                    <p className="text-sm text-white/70 mt-1">Approve and monitor courses</p>
                </Link>
                <Link
                    to="/analytics"
                    className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-5 cursor-pointer hover:opacity-90 transition block text-white shadow-lg"
                >
                    <div className="text-3xl mb-3">📊</div>
                    <h3 className="text-lg font-bold">Analytics</h3>
                    <p className="text-sm text-white/70 mt-1">View detailed reports</p>
                </Link>
            </div>
        </div>
    );
}

function AnimatedStatCard({ card, index }) {
    const [animatedValue, setAnimatedValue] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Stagger animation based on index
        const timer = setTimeout(() => setIsVisible(true), 100 + (index * 150));
        return () => clearTimeout(timer);
    }, [index]);

    useEffect(() => {
        if (!isVisible) return;

        // Extract numeric value for animation
        const numericValue = parseInt(card.value.replace(/[^\d]/g, '')) || 0;
        const duration = 1200;
        const steps = 60;
        const increment = numericValue / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= numericValue) {
                setAnimatedValue(numericValue);
                clearInterval(timer);
            } else {
                setAnimatedValue(Math.floor(current));
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [card.value, isVisible]);

    const displayValue = card.value.replace(/\d+/, animatedValue.toLocaleString());

    return (
        <div className={`bg-[#12122a] border border-purple-900/30 rounded-2xl p-6 transform transition-all duration-700 hover:scale-105 hover:shadow-lg ${
            isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'
        }`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white text-xl animate-pulse`}>
                    {card.icon}
                </div>
                <span className="text-xs text-gray-400 bg-[#1a1a35] px-2 py-1 rounded-full">
                    {card.subtitle}
                </span>
            </div>
            <div>
                <p className="text-2xl font-bold text-white transition-all duration-300">{displayValue}</p>
                <p className="text-sm text-gray-400 mt-1">{card.change}</p>
            </div>
        </div>
    );
}
