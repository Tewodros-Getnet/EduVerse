import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api/axios';

export default function InstructorAITools() {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('quiz-generator');
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [generatedContent, setGeneratedContent] = useState(null);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const response = await api.get('/courses/instructor');
            setCourses(Array.isArray(response.data) ? response.data : response.data.courses || []);
        } catch (error) {
            toast.error('Failed to fetch courses');
        }
    };

    const handleQuizGeneration = async (formData) => {
        setLoading(true);
        try {
            const response = await api.post('/ai/instructor/quiz-generator', formData);
            setGeneratedContent(response.data);
            setActiveTab('quiz-results');
            toast.success('Quiz questions generated successfully!');
        } catch (error) {
            toast.error('Failed to generate quiz questions');
        } finally {
            setLoading(false);
        }
    };

    const handleContentSuggestions = async (formData) => {
        setLoading(true);
        try {
            const response = await api.post('/ai/instructor/content-suggestions', formData);
            setGeneratedContent(response.data);
            setActiveTab('suggestions-results');
            toast.success('Content suggestions generated successfully!');
        } catch (error) {
            toast.error('Failed to generate content suggestions');
        } finally {
            setLoading(false);
        }
    };

    const handleFeedbackGeneration = async (formData) => {
        setLoading(true);
        try {
            const response = await api.post('/ai/instructor/feedback-generator', formData);
            setGeneratedContent(response.data);
            setActiveTab('feedback-results');
            toast.success('Feedback generated successfully!');
        } catch (error) {
            toast.error('Failed to generate feedback');
        } finally {
            setLoading(false);
        }
    };

    const handleCourseOptimization = async (formData) => {
        setLoading(true);
        try {
            const response = await api.post('/ai/instructor/course-optimizer', formData);
            setGeneratedContent(response.data);
            setActiveTab('optimization-results');
            toast.success('Course optimization suggestions generated!');
        } catch (error) {
            toast.error('Failed to generate optimization suggestions');
        } finally {
            setLoading(false);
        }
    };

    const handleStudentInsights = async (formData) => {
        setLoading(true);
        try {
            const response = await api.post('/ai/instructor/student-insights', formData);
            setGeneratedContent(response.data);
            setActiveTab('insights-results');
            toast.success('Student insights generated successfully!');
        } catch (error) {
            toast.error('Failed to generate student insights');
        } finally {
            setLoading(false);
        }
    };

    const handleLearningPathGeneration = async (formData) => {
        setLoading(true);
        try {
            const response = await api.post('/ai/instructor/learning-path-generator', formData);
            setGeneratedContent(response.data);
            setActiveTab('learning-path-results');
            toast.success('Learning path generated successfully!');
        } catch (error) {
            toast.error('Failed to generate learning path');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] to-[#1a1a2e] px-4 py-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                            AI Teaching Assistant
                        </h1>
                        <p className="text-gray-400 text-sm mt-2">Powerful AI-powered tools to enhance your teaching and create engaging content</p>
                    </div>
                    <select
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        className="px-4 py-2.5 bg-[#12122a] border border-purple-900/40 rounded-xl text-white text-sm hover:border-purple-500/50 transition focus:outline-none focus:border-purple-500"
                    >
                        <option value="">Select a course</option>
                        {courses.map(course => (
                            <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                    </select>
                </div>

                {/* Tab Navigation */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {[
                        { id: 'quiz-generator', label: 'Quiz Generator', icon: '📝' },
                        { id: 'content-suggestions', label: 'Content Suggestions', icon: '💡' },
                        { id: 'feedback-generator', label: 'Feedback Generator', icon: '✍️' },
                        { id: 'course-optimizer', label: 'Course Optimizer', icon: '⚡' },
                        { id: 'student-insights', label: 'Student Insights', icon: '👥' },
                        { id: 'learning-path', label: 'Learning Path', icon: '🛤️' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`p-3 rounded-xl text-sm font-medium transition flex flex-col items-center gap-2 ${activeTab === tab.id
                                ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20'
                                : 'bg-[#12122a] text-gray-300 hover:text-white hover:border-purple-500/50 border border-purple-900/40'
                                }`}
                        >
                            <span className="text-xl">{tab.icon}</span>
                            <span className="text-xs">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-6 md:p-8">
                    {/* Quiz Generator Tab */}
                    {activeTab === 'quiz-generator' && (
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">AI Quiz Generator</h3>
                            <p className="text-gray-400 text-sm mb-6">Create engaging quiz questions powered by AI</p>
                            <QuizGeneratorForm
                                onSubmit={handleQuizGeneration}
                                loading={loading}
                                courses={courses}
                            />
                        </div>
                    )}

                    {/* Quiz Results Tab */}
                    {activeTab === 'quiz-results' && generatedContent && (
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Generated Quiz Questions</h3>
                            <p className="text-gray-400 text-sm mb-6">Review and customize your AI-generated questions</p>
                            <QuizResults data={generatedContent} />
                        </div>
                    )}

                    {/* Content Suggestions Tab */}
                    {activeTab === 'content-suggestions' && (
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">AI Content Suggestions</h3>
                            <p className="text-gray-400 text-sm mb-6">Get AI-powered suggestions for improving your course content</p>
                            <ContentSuggestionsForm
                                onSubmit={handleContentSuggestions}
                                loading={loading}
                                courses={courses}
                            />
                        </div>
                    )}

                    {/* Suggestions Results Tab */}
                    {activeTab === 'suggestions-results' && generatedContent && (
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Content Suggestions</h3>
                            <p className="text-gray-400 text-sm mb-6">Recommended improvements for your course</p>
                            <ContentSuggestionsResults data={generatedContent} />
                        </div>
                    )}

                    {/* Feedback Generator Tab */}
                    {activeTab === 'feedback-generator' && (
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">AI Feedback Generator</h3>
                            <p className="text-gray-400 text-sm mb-6">Generate personalized feedback for your students</p>
                            <FeedbackGeneratorForm
                                onSubmit={handleFeedbackGeneration}
                                loading={loading}
                            />
                        </div>
                    )}

                    {/* Feedback Results Tab */}
                    {activeTab === 'feedback-results' && generatedContent && (
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Generated Feedback</h3>
                            <p className="text-gray-400 text-sm mb-6">Personalized feedback ready to send to students</p>
                            <FeedbackResults data={generatedContent} />
                        </div>
                    )}

                    {/* Course Optimizer Tab */}
                    {activeTab === 'course-optimizer' && (
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">AI Course Optimizer</h3>
                            <p className="text-gray-400 text-sm mb-6">Get recommendations to optimize your course structure and content</p>
                            <CourseOptimizerForm
                                onSubmit={handleCourseOptimization}
                                loading={loading}
                                courses={courses}
                            />
                        </div>
                    )}

                    {/* Optimization Results Tab */}
                    {activeTab === 'optimization-results' && generatedContent && (
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Course Optimization Suggestions</h3>
                            <p className="text-gray-400 text-sm mb-6">Recommended improvements for better student engagement</p>
                            <OptimizationResults data={generatedContent} />
                        </div>
                    )}

                    {/* Student Insights Tab */}
                    {activeTab === 'student-insights' && (
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">AI Student Insights</h3>
                            <p className="text-gray-400 text-sm mb-6">Analyze student performance and learning patterns</p>
                            <StudentInsightsForm
                                onSubmit={handleStudentInsights}
                                loading={loading}
                                courses={courses}
                            />
                        </div>
                    )}

                    {/* Insights Results Tab */}
                    {activeTab === 'insights-results' && generatedContent && (
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Student Performance Insights</h3>
                            <p className="text-gray-400 text-sm mb-6">Data-driven insights about your students</p>
                            <StudentInsightsResults data={generatedContent} />
                        </div>
                    )}

                    {/* Learning Path Tab */}
                    {activeTab === 'learning-path' && (
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">AI Learning Path Generator</h3>
                            <p className="text-gray-400 text-sm mb-6">Create personalized learning paths for your students</p>
                            <LearningPathForm
                                onSubmit={handleLearningPathGeneration}
                                loading={loading}
                                courses={courses}
                            />
                        </div>
                    )}

                    {/* Learning Path Results Tab */}
                    {activeTab === 'learning-path-results' && generatedContent && (
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Generated Learning Path</h3>
                            <p className="text-gray-400 text-sm mb-6">Personalized learning journey for students</p>
                            <LearningPathResults data={generatedContent} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Quiz Generator Form Component
function QuizGeneratorForm({ onSubmit, loading, courses }) {
    const [formData, setFormData] = useState({
        course_id: '',
        topic: '',
        difficulty: 'medium',
        question_count: 5,
        question_types: ['multiple_choice']
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.course_id || !formData.topic) {
            toast.error('Please fill in all required fields');
            return;
        }
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Course *</label>
                    <select
                        value={formData.course_id}
                        onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm"
                        required
                    >
                        <option value="">Select a course</option>
                        {courses.map(course => (
                            <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Topic *</label>
                    <input
                        type="text"
                        value={formData.topic}
                        onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm"
                        placeholder="e.g., JavaScript Fundamentals"
                        required
                    />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Difficulty</label>
                    <select
                        value={formData.difficulty}
                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm"
                    >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Number of Questions</label>
                    <input
                        type="number"
                        min="1"
                        max="20"
                        value={formData.question_count}
                        onChange={(e) => setFormData({ ...formData, question_count: parseInt(e.target.value) })}
                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Question Types</label>
                    <select
                        value={formData.question_types[0]}
                        onChange={(e) => setFormData({ ...formData, question_types: [e.target.value] })}
                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm"
                    >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="true_false">True/False</option>
                        <option value="short_answer">Short Answer</option>
                    </select>
                </div>
            </div>
            <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white font-medium hover:opacity-90 transition disabled:opacity-50"
            >
                {loading ? 'Generating...' : 'Generate Quiz Questions'}
            </button>
        </form>
    );
}

// Quiz Results Component
function QuizResults({ data }) {
    const getOptionLabel = (index, option) => {
        // If option is just "Option A", "Option B", etc., use it as label
        // Otherwise, use A, B, C, D as labels
        const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
        if (option.startsWith('Option') && option.length < 10) {
            return option;
        }
        return `${labels[index]}. ${option}`;
    };

    return (
        <div className="space-y-4">
            <div className="bg-[#1a1a35] rounded-xl p-4">
                <h4 className="font-medium text-white mb-2">{data.course_title}</h4>
                <p className="text-sm text-gray-400">Topic: {data.topic} • Difficulty: {data.difficulty}</p>
                <p className="text-xs text-gray-500">Generated: {new Date(data.generated_at).toLocaleString()}</p>
            </div>
            <div className="space-y-3">
                {data.questions.map((question, index) => (
                    <div key={index} className="bg-[#1a1a35] rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-white">Question {index + 1}</h5>
                            <span className="text-sm text-purple-400">{question.points} points</span>
                        </div>
                        <p className="text-white mb-3">{question.question}</p>
                        {question.question_type === 'multiple_choice' && question.options && (
                            <div className="space-y-2 mb-3">
                                {question.options.map((option, optIndex) => {
                                    const isCorrect = option === question.correct_answer;
                                    return (
                                        <div key={optIndex} className={`p-2 rounded text-sm ${isCorrect
                                            ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                                            : 'bg-gray-700 text-gray-300'
                                            }`}>
                                            {getOptionLabel(optIndex, option)}
                                            {isCorrect && ' ✓'}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <div className="text-sm text-gray-400">
                            <strong>Correct Answer:</strong> {question.correct_answer}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Content Suggestions Form Component
function ContentSuggestionsForm({ onSubmit, loading, courses }) {
    const [formData, setFormData] = useState({
        course_id: '',
        content_type: 'lesson',
        current_content: '',
        target_audience: '',
        learning_objectives: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.course_id || !formData.content_type) {
            toast.error('Please fill in all required fields');
            return;
        }
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Course *</label>
                    <select
                        value={formData.course_id}
                        onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm"
                        required
                    >
                        <option value="">Select a course</option>
                        {courses.map(course => (
                            <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Content Type *</label>
                    <select
                        value={formData.content_type}
                        onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm"
                        required
                    >
                        <option value="lesson">Lesson</option>
                        <option value="assignment">Assignment</option>
                        <option value="quiz">Quiz</option>
                        <option value="video">Video</option>
                        <option value="reading">Reading Material</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-sm text-gray-400 mb-1">Current Content</label>
                <textarea
                    value={formData.current_content}
                    onChange={(e) => setFormData({ ...formData, current_content: e.target.value })}
                    rows={4}
                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm resize-none"
                    placeholder="Describe your current content (optional)"
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Target Audience</label>
                    <input
                        type="text"
                        value={formData.target_audience}
                        onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm"
                        placeholder="e.g., Beginners, Advanced students"
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Learning Objectives</label>
                    <input
                        type="text"
                        value={formData.learning_objectives}
                        onChange={(e) => setFormData({ ...formData, learning_objectives: e.target.value })}
                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm"
                        placeholder="e.g., Understand basic concepts"
                    />
                </div>
            </div>
            <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white font-medium hover:opacity-90 transition disabled:opacity-50"
            >
                {loading ? 'Generating...' : 'Generate Suggestions'}
            </button>
        </form>
    );
}

// Content Suggestions Results Component
function ContentSuggestionsResults({ data }) {
    return (
        <div className="space-y-4">
            <div className="bg-[#1a1a35] rounded-xl p-4">
                <h4 className="font-medium text-white mb-2">{data.course_title}</h4>
                <p className="text-sm text-gray-400">Content Type: {data.content_type}</p>
                <p className="text-xs text-gray-500">Generated: {new Date(data.generated_at).toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(data.suggestions).map(([category, suggestions]) => (
                    <div key={category} className="bg-[#1a1a35] rounded-xl p-4">
                        <h5 className="font-medium text-white mb-3 capitalize">
                            {category.replace('_', ' ')}
                        </h5>
                        <ul className="space-y-2">
                            {suggestions.map((suggestion, index) => (
                                <li key={index} className="text-sm text-gray-300 flex items-start">
                                    <span className="text-purple-400 mr-2">•</span>
                                    {suggestion}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Feedback Generator Form Component
function FeedbackGeneratorForm({ onSubmit, loading }) {
    const [formData, setFormData] = useState({
        student_work: '',
        assignment_type: 'essay',
        rubric_criteria: '',
        student_level: 'intermediate'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.student_work || !formData.assignment_type) {
            toast.error('Please fill in all required fields');
            return;
        }
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm text-gray-400 mb-1">Student Work *</label>
                <textarea
                    value={formData.student_work}
                    onChange={(e) => setFormData({ ...formData, student_work: e.target.value })}
                    rows={6}
                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm resize-none"
                    placeholder="Paste or describe the student's work..."
                    required
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Assignment Type *</label>
                    <select
                        value={formData.assignment_type}
                        onChange={(e) => setFormData({ ...formData, assignment_type: e.target.value })}
                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm"
                        required
                    >
                        <option value="essay">Essay</option>
                        <option value="project">Project</option>
                        <option value="presentation">Presentation</option>
                        <option value="quiz">Quiz</option>
                        <option value="assignment">Assignment</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Student Level</label>
                    <select
                        value={formData.student_level}
                        onChange={(e) => setFormData({ ...formData, student_level: e.target.value })}
                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm"
                    >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-sm text-gray-400 mb-1">Rubric Criteria</label>
                <textarea
                    value={formData.rubric_criteria}
                    onChange={(e) => setFormData({ ...formData, rubric_criteria: e.target.value })}
                    rows={3}
                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm resize-none"
                    placeholder="Describe the evaluation criteria (optional)"
                />
            </div>
            <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white font-medium hover:opacity-90 transition disabled:opacity-50"
            >
                {loading ? 'Generating...' : 'Generate Feedback'}
            </button>
        </form>
    );
}

// Feedback Results Component
function FeedbackResults({ data }) {
    return (
        <div className="space-y-4">
            <div className="bg-[#1a1a35] rounded-xl p-4">
                <h4 className="font-medium text-white mb-2">Generated Feedback</h4>
                <p className="text-sm text-gray-400">Assignment Type: {data.assignment_type}</p>
                <p className="text-xs text-gray-500">Generated: {new Date(data.generated_at).toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#1a1a35] rounded-xl p-4">
                    <h5 className="font-medium text-green-400 mb-3">Strengths</h5>
                    <ul className="space-y-2">
                        {data.feedback.strengths.map((strength, index) => (
                            <li key={index} className="text-sm text-gray-300 flex items-start">
                                <span className="text-green-400 mr-2">✓</span>
                                {strength}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-[#1a1a35] rounded-xl p-4">
                    <h5 className="font-medium text-yellow-400 mb-3">Areas for Improvement</h5>
                    <ul className="space-y-2">
                        {data.feedback.areas_for_improvement.map((area, index) => (
                            <li key={index} className="text-sm text-gray-300 flex items-start">
                                <span className="text-yellow-400 mr-2">→</span>
                                {area}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-[#1a1a35] rounded-xl p-4">
                    <h5 className="font-medium text-blue-400 mb-3">Next Steps</h5>
                    <ul className="space-y-2">
                        {data.feedback.next_steps.map((step, index) => (
                            <li key={index} className="text-sm text-gray-300 flex items-start">
                                <span className="text-blue-400 mr-2">▶</span>
                                {step}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-[#1a1a35] rounded-xl p-4">
                    <h5 className="font-medium text-purple-400 mb-3">Encouragement</h5>
                    <p className="text-sm text-gray-300 italic">{data.feedback.encouragement}</p>
                    <div className="mt-3 pt-3 border-t border-gray-600">
                        <span className="text-sm text-gray-400">Estimated Grade: </span>
                        <span className="text-lg font-bold text-purple-400">{data.feedback.estimated_grade_suggestion}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Course Optimizer Form Component
function CourseOptimizerForm({ onSubmit, loading, courses }) {
    const [formData, setFormData] = useState({
        course_id: '',
        current_performance_data: '',
        target_metrics: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.course_id) {
            toast.error('Please select a course');
            return;
        }
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm text-gray-400 mb-1">Course *</label>
                <select
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm"
                    required
                >
                    <option value="">Select a course</option>
                    {courses.map(course => (
                        <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-sm text-gray-400 mb-1">Current Performance Data</label>
                <textarea
                    value={formData.current_performance_data}
                    onChange={(e) => setFormData({ ...formData, current_performance_data: e.target.value })}
                    rows={4}
                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm resize-none"
                    placeholder="Describe current performance metrics (optional)"
                />
            </div>
            <div>
                <label className="block text-sm text-gray-400 mb-1">Target Metrics</label>
                <textarea
                    value={formData.target_metrics}
                    onChange={(e) => setFormData({ ...formData, target_metrics: e.target.value })}
                    rows={3}
                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm resize-none"
                    placeholder="Describe your target goals (optional)"
                />
            </div>
            <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white font-medium hover:opacity-90 transition disabled:opacity-50"
            >
                {loading ? 'Analyzing...' : 'Generate Optimization Suggestions'}
            </button>
        </form>
    );
}

// Optimization Results Component
function OptimizationResults({ data }) {
    return (
        <div className="space-y-4">
            <div className="bg-[#1a1a35] rounded-xl p-4">
                <h4 className="font-medium text-white mb-2">{data.course_title}</h4>
                <p className="text-xs text-gray-500">Generated: {new Date(data.generated_at).toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(data.optimization).map(([category, suggestions]) => (
                    <div key={category} className="bg-[#1a1a35] rounded-xl p-4">
                        <h5 className="font-medium text-white mb-3 capitalize">
                            {category.replace('_', ' ')}
                        </h5>
                        <ul className="space-y-2">
                            {suggestions.map((suggestion, index) => (
                                <li key={index} className="text-sm text-gray-300 flex items-start">
                                    <span className="text-purple-400 mr-2">•</span>
                                    {suggestion}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Student Insights Form Component
function StudentInsightsForm({ onSubmit, loading, courses }) {
    const [formData, setFormData] = useState({
        course_id: '',
        time_period: '30_days'
    });
    const [fetching, setFetching] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.course_id) {
            toast.error('Please select a course');
            return;
        }

        setFetching(true);
        try {
            // Fetch real student performance data for the selected course
            const res = await api.get(`/analytics/instructor/students/${formData.course_id}`);
            const students = res.data.students || [];

            if (students.length === 0) {
                toast.error('No students enrolled in this course yet');
                return;
            }

            // Build a structured summary to send to the AI
            const studentData = {
                total_students: students.length,
                avg_progress: Math.round(students.reduce((s, u) => s + (u.progress_percent || 0), 0) / students.length),
                avg_quiz_score: Math.round(students.reduce((s, u) => s + (parseFloat(u.avg_quiz_score) || 0), 0) / students.length),
                students: students.slice(0, 10).map(u => ({
                    name: u.name,
                    progress: Math.round(u.progress_percent || 0),
                    completed_lessons: u.completed_lessons || 0,
                    avg_quiz_score: Math.round(parseFloat(u.avg_quiz_score) || 0),
                })),
            };

            onSubmit({ ...formData, student_data: studentData });
        } catch {
            toast.error('Failed to fetch student data');
        } finally {
            setFetching(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Course *</label>
                    <select
                        value={formData.course_id}
                        onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm"
                        required
                    >
                        <option value="">Select a course</option>
                        {courses.map(course => (
                            <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Time Period</label>
                    <select
                        value={formData.time_period}
                        onChange={(e) => setFormData({ ...formData, time_period: e.target.value })}
                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm"
                    >
                        <option value="7_days">Last 7 Days</option>
                        <option value="30_days">Last 30 Days</option>
                        <option value="90_days">Last 90 Days</option>
                    </select>
                </div>
            </div>
            <p className="text-xs text-gray-500">
                Student performance data will be fetched automatically from the selected course.
            </p>
            <button
                type="submit"
                disabled={loading || fetching}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white font-medium hover:opacity-90 transition disabled:opacity-50"
            >
                {fetching ? 'Fetching data...' : loading ? 'Analyzing...' : 'Generate Insights'}
            </button>
        </form>
    );
}

// Student Insights Results Component
function StudentInsightsResults({ data }) {
    return (
        <div className="space-y-4">
            <div className="bg-[#1a1a35] rounded-xl p-4">
                <h4 className="font-medium text-white mb-2">{data.course_title}</h4>
                <p className="text-sm text-gray-400">Time Period: {data.time_period}</p>
                <p className="text-xs text-gray-500">Generated: {new Date(data.generated_at).toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#1a1a35] rounded-xl p-4">
                    <h5 className="font-medium text-white mb-3">Performance Trends</h5>
                    <ul className="space-y-2">
                        {data.insights.performance_trends.map((trend, index) => (
                            <li key={index} className="text-sm text-gray-300 flex items-start">
                                <span className="text-blue-400 mr-2"></span>
                                {trend}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-[#1a1a35] rounded-xl p-4">
                    <h5 className="font-medium text-white mb-3">Common Challenges</h5>
                    <ul className="space-y-2">
                        {data.insights.common_challenges.map((challenge, index) => (
                            <li key={index} className="text-sm text-gray-300 flex items-start">
                                <span className="text-yellow-400 mr-2"></span>
                                {challenge}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-[#1a1a35] rounded-xl p-4">
                    <h5 className="font-medium text-white mb-3">Recommended Actions</h5>
                    <ul className="space-y-2">
                        {data.insights.recommended_actions.map((action, index) => (
                            <li key={index} className="text-sm text-gray-300 flex items-start">
                                <span className="text-green-400 mr-2">✓</span>
                                {action}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

// Learning Path Form Component
function LearningPathForm({ onSubmit, loading, courses }) {
    const [formData, setFormData] = useState({
        course_id: '',
        student_profile: '',
        learning_goals: '',
        time_constraint: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.course_id || !formData.student_profile) {
            toast.error('Please fill in all required fields');
            return;
        }
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm text-gray-400 mb-1">Course *</label>
                <select
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm"
                    required
                >
                    <option value="">Select a course</option>
                    {courses.map(course => (
                        <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-sm text-gray-400 mb-1">Student Profile *</label>
                <textarea
                    value={formData.student_profile}
                    onChange={(e) => setFormData({ ...formData, student_profile: e.target.value })}
                    rows={3}
                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm resize-none"
                    placeholder="Describe the student's background, current level, strengths, weaknesses..."
                    required
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Learning Goals</label>
                    <input
                        type="text"
                        value={formData.learning_goals}
                        onChange={(e) => setFormData({ ...formData, learning_goals: e.target.value })}
                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm"
                        placeholder="e.g., Master JavaScript basics"
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Time Constraint</label>
                    <input
                        type="text"
                        value={formData.time_constraint}
                        onChange={(e) => setFormData({ ...formData, time_constraint: e.target.value })}
                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm"
                        placeholder="e.g., 2 weeks, 1 month"
                    />
                </div>
            </div>
            <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white font-medium hover:opacity-90 transition disabled:opacity-50"
            >
                {loading ? 'Generating...' : 'Generate Learning Path'}
            </button>
        </form>
    );
}

// Learning Path Results Component
function LearningPathResults({ data }) {
    return (
        <div className="space-y-4">
            <div className="bg-[#1a1a35] rounded-xl p-4">
                <h4 className="font-medium text-white mb-2">{data.course_title}</h4>
                <p className="text-sm text-gray-400">Total Estimated Time: {data.learning_path.total_estimated_time}</p>
                <p className="text-xs text-gray-500">Generated: {new Date(data.generated_at).toLocaleString()}</p>
            </div>
            <div className="bg-[#1a1a35] rounded-xl p-4">
                <h5 className="font-medium text-white mb-3">Learning Path Steps</h5>
                <div className="space-y-3">
                    {data.learning_path.learning_path.map((step, index) => (
                        <div key={index} className="border-l-4 border-purple-500 pl-4">
                            <div className="flex justify-between items-start mb-2">
                                <h6 className="font-medium text-white">Step {step.step}: {step.activity}</h6>
                                <span className="text-sm text-purple-400">{step.estimated_time}</span>
                            </div>
                            <div className="text-sm text-gray-400 space-y-1">
                                <p><strong>Assessment:</strong> {step.assessment_type}</p>
                                {step.prerequisites.length > 0 && (
                                    <p><strong>Prerequisites:</strong> {step.prerequisites.join(', ')}</p>
                                )}
                                {step.support_resources.length > 0 && (
                                    <p><strong>Resources:</strong> {step.support_resources.join(', ')}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#1a1a35] rounded-xl p-4">
                    <h5 className="font-medium text-white mb-3">Key Milestones</h5>
                    <ul className="space-y-2">
                        {data.learning_path.key_milestones.map((milestone, index) => (
                            <li key={index} className="text-sm text-gray-300 flex items-start">
                                <span className="text-green-400 mr-2"></span>
                                {milestone}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-[#1a1a35] rounded-xl p-4">
                    <h5 className="font-medium text-white mb-3">Success Metrics</h5>
                    <ul className="space-y-2">
                        {data.learning_path.success_metrics.map((metric, index) => (
                            <li key={index} className="text-sm text-gray-300 flex items-start">
                                <span className="text-blue-400 mr-2">✓</span>
                                {metric}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
