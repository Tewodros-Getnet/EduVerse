import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function AllAssignments() {
    const [assignments, setAssignments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCoursesAndAssignments();
    }, []);

    const fetchCoursesAndAssignments = async () => {
        try {
            // Get enrolled courses
            const coursesRes = await api.get('/courses/my/enrolled');
            const coursesData = coursesRes.data.courses || [];
            setCourses(coursesData);

            // Get assignments for each course
            const assignmentsPromises = coursesData.map(course =>
                api.get(`/assignments/course/${course.id}`).catch(() => ({ data: { assignments: [] } }))
            );
            
            const assignmentsResults = await Promise.all(assignmentsPromises);
            const allAssignments = assignmentsResults.flatMap((result, index) => 
                ((Array.isArray(result.data) ? result.data : result.data.assignments) || []).map(assignment => ({
                    ...assignment,
                    course_title: coursesData[index].title,
                    course_id: coursesData[index].id
                }))
            );
            
            setAssignments(allAssignments);
        } catch (error) {
            toast.error('Failed to load assignments');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center py-20 text-gray-400">Loading assignments...</div>;
    }

    if (courses.length === 0) {
        return (
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-white mb-6">Assignments</h1>
                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-8 text-center text-gray-400">
                    <p className="mb-4">No courses enrolled yet</p>
                    <Link to="/student/courses" className="px-4 py-2 bg-purple-600 rounded-xl text-white hover:bg-purple-700 transition">
                        Browse Courses
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-white">All Assignments</h1>

            {assignments.length === 0 ? (
                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-8 text-center text-gray-400">
                    No assignments available in your enrolled courses
                </div>
            ) : (
                <div className="space-y-4">
                    {assignments.map(assignment => (
                        <div key={assignment.id} className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-white">{assignment.title}</h3>
                                    <p className="text-xs text-gray-400 mt-1">{assignment.description}</p>
                                    <p className="text-xs text-purple-400 mt-2">Course: {assignment.course_title}</p>
                                </div>
                                <span className="text-xs px-2 py-1 rounded-full font-medium bg-yellow-500/20 text-yellow-300">
                                    Pending
                                </span>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                                <span>📅 Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                                <span>⭐ {assignment.total_points} points</span>
                            </div>

                            <Link 
                                to={`/student/assignments/${assignment.course_id}`}
                                className="w-full py-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition inline-block text-center">
                                View Assignment
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
