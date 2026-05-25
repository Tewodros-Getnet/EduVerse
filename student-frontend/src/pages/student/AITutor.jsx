import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function AITutor() {
    const [searchParams] = useSearchParams();
    const courseId = searchParams.get('course');
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hi! I\'m your AI tutor. Ask me anything about your courses or any topic you\'re studying. ' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [useDeep, setUseDeep] = useState(false);
    const [activeTab, setActiveTab] = useState('chat'); // chat, recommendations, explanations
    const [recommendations, setRecommendations] = useState([]);
    const [explanations, setExplanations] = useState([]);
    const [learningPath, setLearningPath] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [courseContext, setCourseContext] = useState(courseId || '');
    const bottomRef = useRef(null);
    const topicInputRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        fetchRecommendations();
        fetchLearningPath();
    }, [messages]);

    const fetchRecommendations = async () => {
        try {
            const response = await api.get('/ai/student/recommendations');
            setRecommendations(response.data.recommendations || []);
        } catch (error) {
            console.error('Failed to fetch recommendations:', error);
        }
    };

    const fetchLearningPath = async () => {
        try {
            const res = await api.get('/ai/student/learning-path');
            setLearningPath(res.data.learning_path || []);
        } catch (error) {
            console.error('Failed to fetch learning path:', error);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const question = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: question }]);
        setLoading(true);
        setIsTyping(true);

        try {
            const res = await api.post('/ai/chat', {
                question,
                course_id: courseContext,
                use_deep: useDeep,
                conversation_history: messages.slice(-10).map(m => ({
                    role: m.role,
                    content: m.content
                }))
            });
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: res.data.answer,
                ai_source: res.data.ai_source,
                response_time_ms: res.data.response_time_ms,
            }]);
        } catch (error) {
            console.error('AI chat error:', error);
            const errorMsg = error.response?.data?.message || error.message || 'AI tutor unavailable. Please try again.';
            toast.error(errorMsg);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `I apologize, but I encountered an error: ${errorMsg}. Please try again or check your internet connection.`,
                isError: true
            }]);
        } finally {
            setLoading(false);
            setIsTyping(false);
        }
    };

    const generateExplanation = async (topic, difficulty = 'intermediate') => {
        setLoading(true);
        try {
            const res = await api.post('/ai/student/explain', {
                topic,
                difficulty,
                context: courseContext
            });

            const explanation = {
                role: 'assistant',
                content: res.data.explanation,
                isExplanation: true,
                topic
            };

            setMessages(prev => [...prev, {
                role: 'user',
                content: `Explain "${topic}" at ${difficulty} level`
            }, explanation]);

            setActiveTab('chat');
        } catch (error) {
            toast.error('Failed to generate explanation');
        } finally {
            setLoading(false);
        }
    };

    const generateQuiz = async (topic, questionCount = 5) => {
        setLoading(true);
        try {
            const res = await api.post('/ai/student/generate-quiz', {
                topic,
                question_count: questionCount,
                context: courseContext
            });

            const quiz = {
                role: 'assistant',
                content: res.data.quiz_content,
                isQuiz: true,
                topic
            };

            setMessages(prev => [...prev, {
                role: 'user',
                content: `Generate a quiz about "${topic}" with ${questionCount} questions`
            }, quiz]);

            setActiveTab('chat');
        } catch (error) {
            toast.error('Failed to generate quiz');
        } finally {
            setLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([{
            role: 'assistant',
            content: 'Chat cleared! How can I help you with your learning today?'
        }]);
    };

    const suggestedQuestions = [
        'Explain backpropagation in simple terms',
        'What is gradient descent?',
        'How do neural networks learn?',
        'What is overfitting?',
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] to-[#1a1a2e] px-4 py-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                                AI Learning Assistant
                            </h1>
                            <p className="text-gray-400 text-sm mt-2">Your personal AI tutor and study companion</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <select
                                value={courseContext}
                                onChange={(e) => setCourseContext(e.target.value)}
                                className="px-4 py-2.5 bg-[#12122a] border border-purple-900/40 rounded-xl text-white text-sm hover:border-purple-500/50 transition focus:outline-none focus:border-purple-500"
                            >
                                <option value="">General Context</option>
                                <option value="mathematics">Mathematics</option>
                                <option value="science">Science</option>
                                <option value="programming">Programming</option>
                                <option value="languages">Languages</option>
                                <option value="business">Business</option>
                            </select>
                            <button
                                onClick={clearChat}
                                className="px-4 py-2.5 bg-red-600/20 border border-red-500/30 rounded-xl text-red-300 text-sm hover:bg-red-600/30 transition"
                            >
                                Clear Chat
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
                    {/* Chat Area */}
                    <div className={`lg:col-span-2 flex flex-col ${activeTab === 'chat' ? 'block' : 'hidden lg:block'}`}>
                        <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl flex-1 flex flex-col">
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user'
                                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                                            : 'bg-[#1a1a35] border border-purple-900/30 text-gray-300'
                                            }`}>
                                            {msg.isExplanation && (
                                                <div className="flex items-center gap-2 mb-2 text-xs">
                                                    <span className="bg-purple-600/30 px-2 py-1 rounded-full text-purple-300">
                                                        Explanation: {msg.topic}
                                                    </span>
                                                </div>
                                            )}
                                            {msg.isQuiz && (
                                                <div className="flex items-center gap-2 mb-2 text-xs">
                                                    <span className="bg-green-600/30 px-2 py-1 rounded-full text-green-300">
                                                        Quiz: {msg.topic}
                                                    </span>
                                                </div>
                                            )}
                                            {msg.role === 'assistant' && (
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-xs font-medium ${msg.isError ? 'text-red-400' : 'text-purple-400'}`}>
                                                        {msg.isError ? '⚠️ Error' : 'AI Tutor'}
                                                    </span>
                                                    {msg.ai_source && !msg.isError && (
                                                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${msg.ai_source === 'groq' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                                                            {msg.ai_source}
                                                        </span>
                                                    )}
                                                    {msg.response_time_ms && !msg.isError && (
                                                        <span className="text-xs text-gray-500">{msg.response_time_ms}ms</span>
                                                    )}
                                                </div>
                                            )}
                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-[#1a1a35] border border-purple-900/30 text-gray-300 rounded-2xl p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={bottomRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 border-t border-purple-900/30">
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(e)}
                                        placeholder="Ask me anything about your learning..."
                                        className="flex-1 bg-[#1a1a35] border border-purple-900/40 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm"
                                        disabled={loading}
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={loading || !input.trim()}
                                        className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-medium hover:opacity-90 transition disabled:opacity-50"
                                    >
                                        {loading ? '...' : 'Send'}
                                    </button>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex gap-2 flex-wrap">
                                    {[
                                        { icon: '', label: 'Explain Concept', action: 'explain' },
                                        { icon: '', label: 'Practice Quiz', action: 'quiz' },
                                        { icon: '', label: 'Study Tips', action: 'tips' },
                                        { icon: '', label: 'Assignment Help', action: 'assignment' },
                                        { icon: '', label: 'Learning Path', action: 'path' },
                                        { icon: '', label: 'Topic Review', action: 'review' }
                                    ].map((action) => (
                                        <button
                                            key={action.action}
                                            onClick={() => {
                                                const actionMessages = {
                                                    explain: "Can you explain a concept for me?",
                                                    quiz: "Generate a practice quiz for me",
                                                    tips: "Give me some study tips",
                                                    assignment: "I need help with an assignment",
                                                    path: "What should I learn next?",
                                                    review: "Help me review a topic"
                                                };
                                                setInput(actionMessages[action.action]);
                                            }}
                                            className="px-3 py-1.5 bg-[#1a1a35] border border-purple-900/40 rounded-lg text-xs text-gray-300 hover:border-purple-500/50 transition"
                                        >
                                            {action.icon} {action.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Tabs */}
                        <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-1">
                            <div className="grid grid-cols-1 gap-1">
                                {[
                                    { id: 'chat', label: 'Chat', icon: '' },
                                    { id: 'recommendations', label: 'For You', icon: '' },
                                    { id: 'explanations', label: 'Topics', icon: '' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.id
                                            ? 'bg-purple-600 text-white'
                                            : 'text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        <span>{tab.icon}</span>
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Recommendations Tab */}
                        {activeTab === 'recommendations' && (
                            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-4">
                                <h3 className="font-semibold text-white mb-4">Recommended for You</h3>
                                <div className="space-y-3">
                                    {recommendations.length > 0 ? (
                                        recommendations.map((rec, index) => (
                                            <div key={index} className="p-3 bg-[#1a1a35] rounded-lg">
                                                <div className="flex items-start gap-2">
                                                    <span className="text-lg">{rec.icon || ''}</span>
                                                    <div className="flex-1">
                                                        <h4 className="text-sm font-medium text-white mb-1">{rec.title}</h4>
                                                        <p className="text-xs text-gray-400 mb-2">{rec.description}</p>
                                                        <button
                                                            onClick={() => {
                                                                setInput(`Tell me more about: ${rec.title}`);
                                                                setActiveTab('chat');
                                                            }}
                                                            className="text-xs text-purple-400 hover:text-purple-300 transition"
                                                        >
                                                            Learn More →
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8">
                                            <div className="w-12 h-12 bg-[#1a1a35] rounded-full flex items-center justify-center mx-auto mb-3">
                                                <span className="text-xl"></span>
                                            </div>
                                            <p className="text-sm text-gray-400">Start chatting to get personalized recommendations</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Explanations Tab */}
                        {activeTab === 'explanations' && (
                            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-4">
                                <h3 className="font-semibold text-white mb-4">Popular Topics</h3>
                                <div className="space-y-2">
                                    {[
                                        { topic: 'Algebra Basics', difficulty: 'beginner' },
                                        { topic: 'Photosynthesis', difficulty: 'intermediate' },
                                        { topic: 'Web Development', difficulty: 'beginner' },
                                        { topic: 'Calculus', difficulty: 'advanced' },
                                        { topic: 'Data Structures', difficulty: 'intermediate' }
                                    ].map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-[#1a1a35] rounded-lg">
                                            <span className="text-sm text-gray-300">{item.topic}</span>
                                            <button
                                                onClick={() => generateExplanation(item.topic, item.difficulty)}
                                                disabled={loading}
                                                className="px-3 py-1 bg-purple-600/30 border border-purple-500/30 rounded text-xs text-purple-300 hover:bg-purple-600/40 transition disabled:opacity-50"
                                            >
                                                Explain
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4">
                                    <h4 className="text-sm font-medium text-white mb-2">Request custom explanation</h4>
                                    <div className="flex gap-2">
                                        <input
                                            ref={topicInputRef}
                                            type="text"
                                            placeholder="Enter a topic..."
                                            className="flex-1 bg-[#1a1a35] border border-purple-900/40 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const v = topicInputRef.current?.value?.trim();
                                                    if (v) {
                                                        generateExplanation(v);
                                                        topicInputRef.current.value = '';
                                                    }
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const v = topicInputRef.current?.value?.trim();
                                                if (v) {
                                                    generateExplanation(v);
                                                    topicInputRef.current.value = '';
                                                }
                                            }}
                                            className="px-3 py-2 bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 text-sm hover:bg-purple-600/40 transition"
                                        >
                                            Generate
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Chat Controls */}
                        <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-4">
                            <h3 className="font-semibold text-white mb-4">Chat Controls</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={clearChat}
                                    className="w-full py-2 bg-[#1a1a35] border border-purple-900/40 rounded-lg text-gray-300 text-sm hover:border-purple-500/50 transition"
                                >
                                    Clear Chat
                                </button>
                                <div className="text-xs text-gray-400 text-center">
                                    AI responses are generated based on your learning context
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
