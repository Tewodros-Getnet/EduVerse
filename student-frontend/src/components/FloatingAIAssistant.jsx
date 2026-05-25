import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function FloatingAIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'assistant',
            content: 'Hi! I\'m your AI tutor. Ask me anything about your courses, lessons, or any topic you\'re studying. I can also help explain concepts, generate summaries, or recommend what to learn next! 🎓',
            timestamp: new Date(),
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const { user } = useAuth();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = {
            id: Date.now(),
            role: 'user',
            content: input,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await api.post('/ai/chat', {
                question: input,
                use_deep: false,
                conversation_history: messages.slice(-10).map(m => ({
                    role: m.role,
                    content: m.content,
                })),
            });

            const assistantMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: response.data.answer,
                timestamp: new Date(),
                source: response.data.ai_source,
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            toast.error('Failed to get AI response. Please try again.');
            console.error('AI chat error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAction = async (action) => {
        const quickPrompts = {
            explain: 'Can you explain the current lesson in simple terms?',
            summary: 'Please provide a summary of what I\'ve learned so far.',
            next: 'What should I study next?',
            practice: 'Can you give me a practice question?',
        };

        setInput(quickPrompts[action]);
    };

    if (!user) return null;

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full shadow-lg transition-all duration-300 z-40 flex items-center justify-center text-2xl hover:scale-110 ${isOpen
                        ? 'bg-gradient-to-br from-indigo-600 to-purple-600'
                        : 'bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600'
                    }`}
                title="AI Tutor Assistant"
            >
                🧠
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-32 right-4 md:bottom-24 md:right-6 w-[calc(100vw-2rem)] max-w-sm sm:max-w-md h-[min(600px,70vh)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-slate-700 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-lg">AI Tutor</h3>
                            <p className="text-xs text-indigo-100">Always here to help</p>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white hover:text-indigo-100 transition text-xl leading-none"
                        >
                            ←
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-800">
                        {messages.map(msg => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-xs px-4 py-3 rounded-xl ${msg.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-br-none'
                                            : 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-bl-none shadow-sm'
                                        }`}
                                >
                                    <p className="text-sm leading-relaxed">{msg.content}</p>
                                    <p className={`text-xs mt-1 ${msg.role === 'user'
                                            ? 'text-indigo-100'
                                            : 'text-gray-500 dark:text-gray-400'
                                        }`}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-4 py-3 rounded-xl rounded-bl-none">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-100"></div>
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-200"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Actions - Show only if few messages */}
                    {messages.length <= 2 && !loading && (
                        <div className="border-t border-gray-200 dark:border-slate-700 p-3 bg-gray-50 dark:bg-slate-800">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Quick actions:</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleQuickAction('explain')}
                                    className="text-xs px-2 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition"
                                >
                                    📖 Explain
                                </button>
                                <button
                                    onClick={() => handleQuickAction('summary')}
                                    className="text-xs px-2 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition"
                                >
                                    📝 Summary
                                </button>
                                <button
                                    onClick={() => handleQuickAction('next')}
                                    className="text-xs px-2 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition"
                                >
                                    🎯 Next Step
                                </button>
                                <button
                                    onClick={() => handleQuickAction('practice')}
                                    className="text-xs px-2 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition"
                                >
                                    ✏️ Practice
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <form onSubmit={handleSendMessage} className="border-t border-gray-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Ask anything..."
                                className="flex-1 px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                disabled={loading}
                            />
                            <button
                                type="submit"
                                disabled={loading || !input.trim()}
                                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ↑
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-[1px]"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
