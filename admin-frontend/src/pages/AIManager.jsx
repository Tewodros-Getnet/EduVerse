import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function AIManager() {
    const [activeTab, setActiveTab] = useState('stats-summary');
    const [statsSummary, setStatsSummary] = useState(null);
    const [inactiveUsers, setInactiveUsers] = useState([]);
    const [userInsights, setUserInsights] = useState(null);
    const [engagementPrediction, setEngagementPrediction] = useState(null);
    const [loading, setLoading] = useState(false);

    // Form states
    const [summaryForm, setSummaryForm] = useState({ time_period: '30 days' });
    const [inactiveForm, setInactiveForm] = useState({ days_threshold: 30 });
    const [predictionForm, setPredictionForm] = useState({ user_id: '', time_period: '30 days' });
    const [userSearch, setUserSearch] = useState('');
    const [userSearchResults, setUserSearchResults] = useState([]);
    const [searchingUsers, setSearchingUsers] = useState(false);

    useEffect(() => {
        if (activeTab === 'inactive-users') {
            fetchInactiveUsers();
        }
    }, [activeTab]);

    const handleGenerateStatsSummary = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/ai/admin/stats-summary', summaryForm);
            setStatsSummary(response.data);
            toast.success('Statistics summary generated successfully');
        } catch (error) {
            toast.error('Failed to generate statistics summary');
        } finally {
            setLoading(false);
        }
    };

    const fetchInactiveUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/ai/admin/inactive-users?days_threshold=${inactiveForm.days_threshold}`);
            setInactiveUsers(response.data.inactive_users);
            setUserInsights(response.data.insights);
        } catch (error) {
            toast.error('Failed to fetch inactive users');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateInactiveThreshold = async (e) => {
        e.preventDefault();
        await fetchInactiveUsers();
    };

    const handleGenerateEngagementPrediction = async (e) => {
        e.preventDefault();
        if (!predictionForm.user_id) {
            toast.error('Please select a user');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/ai/admin/engagement-prediction', predictionForm);
            setEngagementPrediction(response.data);
            toast.success('Engagement prediction generated successfully');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to generate prediction');
        } finally {
            setLoading(false);
        }
    };

    const searchUsers = async (term) => {
        if (!term.trim()) { setUserSearchResults([]); return; }
        setSearchingUsers(true);
        try {
            const res = await api.get(`/users/admin/all?search=${encodeURIComponent(term)}&limit=8`);
            setUserSearchResults(res.data.users || []);
        } catch {
            setUserSearchResults([]);
        } finally {
            setSearchingUsers(false);
        }
    };

    const parseStatsTable = (text) => {
        if (!text) return null;
        
        // Find table sections in the text
        const lines = text.split('\n');
        const tableData = [];
        let inTable = false;
        
        for (const line of lines) {
            if (line.includes('| Category | Metric | Value | % of Total |')) {
                inTable = true;
                continue;
            }
            if (line.includes('|---')) continue;
            
            if (inTable && line.trim().startsWith('|')) {
                const cells = line.split('|').map(c => c.trim()).filter(c => c);
                if (cells.length >= 4) {
                    tableData.push({
                        category: cells[0].replace(/\*\*/g, ''),
                        metric: cells[1],
                        value: cells[2],
                        percentage: cells[3]
                    });
                }
            }
            
            if (line.trim() === '' && inTable) {
                break;
            }
        }
        
        return tableData;
    };

    const formatMarkdown = (text) => {
        if (!text) return '';
        
        // Check if this is a stats summary with table format
        const tableData = parseStatsTable(text);
        if (tableData && tableData.length > 0) {
            return (
                <div className="space-y-4">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[var(--border)]">
                            <thead className="bg-[var(--surface)]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Metric</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Value</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">% of Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-[var(--surface-2)] divide-y divide-[var(--border)]">
                                {tableData.map((row, index) => (
                                    <tr key={index} className={row.category.startsWith('*') ? 'bg-[var(--surface)]' : ''}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text)]">
                                            {row.category}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">
                                            {row.metric}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text)] font-semibold">
                                            {row.value}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--accent-primary)]">
                                            {row.percentage}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Show notes separately */}
                    {text.includes('**Note**') && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                            <p className="text-sm text-[var(--text)]">
                                <span className="font-semibold">Note:</span> {text.split('**Note**')[1]?.trim()}
                            </p>
                        </div>
                    )}
                </div>
            );
        }
        
        // Regular markdown formatting for non-table content
        return text.split('\n').map((line, index) => {
            if (line.startsWith('# ')) {
                return <h2 key={index} className="text-xl font-bold text-[var(--text)] mt-4 mb-2">{line.substring(2)}</h2>;
            } else if (line.startsWith('## ')) {
                return <h3 key={index} className="text-lg font-semibold text-[var(--text)] mt-3 mb-2">{line.substring(3)}</h3>;
            } else if (line.startsWith('### ')) {
                return <h4 key={index} className="text-md font-medium text-[var(--text)] mt-2 mb-1">{line.substring(4)}</h4>;
            } else if (line.startsWith('- ')) {
                return <li key={index} className="ml-4 text-[var(--muted)]">• {line.substring(2)}</li>;
            } else if (line.startsWith('1. ')) {
                return <li key={index} className="ml-4 list-decimal text-[var(--muted)]">{line.substring(3)}</li>;
            } else if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={index} className="font-semibold text-[var(--text)] my-2">{line.substring(2, line.length - 2)}</p>;
            } else if (line.trim() === '') {
                return <br key={index} />;
            } else {
                return <p key={index} className="text-[var(--muted)] my-1">{line}</p>;
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[var(--text)]">AI Analytics & Insights</h1>
                <p className="text-[var(--muted)] text-sm mt-1">Leverage AI for platform analytics and user insights</p>
            </div>

            {/* Tabs */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg">
                <div className="border-b border-[var(--border)]">
                    <nav className="flex space-x-8 px-6">
                        {['stats-summary', 'inactive-users', 'engagement-prediction'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === tab
                                        ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                                        : 'border-transparent text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border)]'
                                }`}
                            >
                                {tab === 'stats-summary' ? 'Statistics Summary' :
                                 tab === 'inactive-users' ? 'Inactive Users' :
                                 'Engagement Prediction'}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {/* Statistics Summary Tab */}
                    {activeTab === 'stats-summary' && (
                        <div>
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Generate AI-Powered Statistics Summary</h3>
                                <form onSubmit={handleGenerateStatsSummary} className="flex gap-4 items-end">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text)] mb-1">Time Period</label>
                                        <select
                                            value={summaryForm.time_period}
                                            onChange={(e) => setSummaryForm({...summaryForm, time_period: e.target.value})}
                                            className="px-3 py-2 bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                                        >
                                            <option value="7 days">Last 7 days</option>
                                            <option value="30 days">Last 30 days</option>
                                            <option value="90 days">Last 90 days</option>
                                            <option value="6 months">Last 6 months</option>
                                        </select>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition font-medium"
                                    >
                                        {loading ? 'Generating...' : 'Generate Summary'}
                                    </button>
                                </form>
                            </div>

                            {statsSummary && (
                                <div className="space-y-6">
                                    <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-4">
                                        <h4 className="font-medium text-[var(--text)] mb-3">Raw Statistics Data</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div className="bg-[var(--surface)] p-3 rounded-lg">
                                                <span className="text-[var(--muted)] block text-xs mb-1">Total Users</span>
                                                <span className="text-[var(--text)] font-bold text-lg">{statsSummary.stats_data.users.total_users}</span>
                                            </div>
                                            <div className="bg-[var(--surface)] p-3 rounded-lg">
                                                <span className="text-[var(--muted)] block text-xs mb-1">Active Users</span>
                                                <span className="text-[var(--accent-primary)] font-bold text-lg">{statsSummary.stats_data.users.active_users}</span>
                                            </div>
                                            <div className="bg-[var(--surface)] p-3 rounded-lg">
                                                <span className="text-[var(--muted)] block text-xs mb-1">Total Courses</span>
                                                <span className="text-[var(--text)] font-bold text-lg">{statsSummary.stats_data.courses.total_courses}</span>
                                            </div>
                                            <div className="bg-[var(--surface)] p-3 rounded-lg">
                                                <span className="text-[var(--muted)] block text-xs mb-1">Total Enrollments</span>
                                                <span className="text-[var(--accent-primary)] font-bold text-lg">{statsSummary.stats_data.enrollments.total_enrollments}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
                                        <h4 className="font-medium text-[var(--text)] mb-4 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-[var(--accent-primary)] rounded-full animate-pulse" />
                                            AI-Generated Insights
                                        </h4>
                                        <div className="prose max-w-none">
                                            {formatMarkdown(statsSummary.summary)}
                                        </div>
                                    </div>

                                    <div className="text-xs text-[var(--muted)] text-right">
                                        Generated at: {new Date(statsSummary.generated_at).toLocaleString()}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Inactive Users Tab */}
                    {activeTab === 'inactive-users' && (
                        <div>
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Detect Inactive Users</h3>
                                <form onSubmit={handleUpdateInactiveThreshold} className="flex gap-4 items-end">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text)] mb-1">Inactive Threshold (days)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="365"
                                            value={inactiveForm.days_threshold}
                                            onChange={(e) => setInactiveForm({...inactiveForm, days_threshold: parseInt(e.target.value)})}
                                            className="px-3 py-2 bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent w-32"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition font-medium"
                                    >
                                        {loading ? 'Analyzing...' : 'Analyze Users'}
                                    </button>
                                </form>
                            </div>

                            {userInsights && (
                                <div className="mb-6 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 rounded-lg p-4">
                                    <h4 className="font-medium text-[var(--text)] mb-2">AI Insights</h4>
                                    <p className="text-[var(--muted)] mb-3">{userInsights.summary}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <h5 className="font-medium text-[var(--text)] mb-2">Role Distribution</h5>
                                            {Object.entries(userInsights.role_distribution).map(([role, count]) => (
                                                <div key={role} className="flex justify-between text-sm">
                                                    <span className="capitalize text-[var(--muted)]">{role}:</span>
                                                    <span className="font-medium text-[var(--text)]">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div>
                                            <h5 className="font-medium text-[var(--text)] mb-2">Average Metrics</h5>
                                            <div className="text-sm space-y-1">
                                                <div className="flex justify-between">
                                                    <span className="text-[var(--muted)]">Courses Enrolled:</span>
                                                    <span className="font-medium text-[var(--text)]">{userInsights.average_metrics.courses_enrolled}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-[var(--muted)]">Progress %:</span>
                                                    <span className="font-medium text-[var(--accent-primary)]">{userInsights.average_metrics.progress_percentage}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <h5 className="font-medium text-[var(--text)] mb-2">Recommendations</h5>
                                        <ul className="text-sm text-[var(--muted)] space-y-1">
                                            {userInsights.recommendations.map((rec, index) => (
                                                <li key={index}>• {rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {inactiveUsers.length > 0 && (
                                <div className="overflow-x-auto border border-[var(--border)] rounded-lg">
                                    <table className="min-w-full divide-y divide-[var(--border)]">
                                        <thead className="bg-[var(--surface)]">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase">User</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase">Role</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase">Courses</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase">Progress</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase">Activities</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase">Last Login</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-[var(--surface-2)] divide-y divide-[var(--border)]">
                                            {inactiveUsers.map((user) => (
                                                <tr key={user.id} className="hover:bg-[var(--surface)] transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div>
                                                            <div className="text-sm font-medium text-[var(--text)]">{user.name}</div>
                                                            <div className="text-sm text-[var(--muted)]">{user.email}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                            user.role === 'instructor' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                            'bg-green-500/20 text-green-400 border border-green-500/30'
                                                        }`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">
                                                        {user.course_count || 0}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--accent-primary)]">
                                                        {Math.round(user.avg_progress || 0)}%
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">
                                                        {(user.lesson_activities || 0) + (user.quiz_attempts || 0) + (user.assignment_submissions || 0)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">
                                                        {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Engagement Prediction Tab */}
                    {activeTab === 'engagement-prediction' && (
                        <div>
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Predict User Engagement</h3>
                                <form onSubmit={handleGenerateEngagementPrediction} className="flex gap-4 items-end flex-wrap">
                                    <div className="flex-1 min-w-[200px] relative">
                                        <label className="block text-sm font-medium text-[var(--text)] mb-1">Search User</label>
                                        <input
                                            type="text"
                                            value={userSearch}
                                            onChange={e => {
                                                setUserSearch(e.target.value);
                                                searchUsers(e.target.value);
                                                if (!e.target.value) setPredictionForm(f => ({ ...f, user_id: '' }));
                                            }}
                                            placeholder="Type name or email..."
                                            className="w-full px-3 py-2 bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                                        />
                                        {userSearchResults.length > 0 && (
                                            <div className="absolute z-10 w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                                                {userSearchResults.map(u => (
                                                    <button
                                                        key={u.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setPredictionForm(f => ({ ...f, user_id: u.id }));
                                                            setUserSearch(`${u.name} (${u.email})`);
                                                            setUserSearchResults([]);
                                                        }}
                                                        className="w-full text-left px-4 py-2 hover:bg-[var(--surface-2)] text-sm transition-colors"
                                                    >
                                                        <span className="font-medium text-[var(--text)]">{u.name}</span>
                                                        <span className="text-[var(--muted)] ml-2">{u.email}</span>
                                                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${u.role === 'instructor' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                                            {u.role}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {predictionForm.user_id && (
                                            <p className="text-xs text-green-500 mt-1">✓ User selected</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text)] mb-1">Time Period</label>
                                        <select
                                            value={predictionForm.time_period}
                                            onChange={(e) => setPredictionForm({...predictionForm, time_period: e.target.value})}
                                            className="px-3 py-2 bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                                        >
                                            <option value="7 days">Last 7 days</option>
                                            <option value="30 days">Last 30 days</option>
                                            <option value="90 days">Last 90 days</option>
                                        </select>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading || !predictionForm.user_id}
                                        className="px-4 py-2 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition font-medium"
                                    >
                                        {loading ? 'Predicting...' : 'Generate Prediction'}
                                    </button>
                                </form>
                            </div>

                            {engagementPrediction && (
                                <div className="space-y-6">
                                    <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-4">
                                        <h4 className="font-medium text-[var(--text)] mb-3">User Profile</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div className="bg-[var(--surface)] p-3 rounded-lg">
                                                <span className="text-[var(--muted)] block text-xs mb-1">Name</span>
                                                <span className="text-[var(--text)] font-medium">{engagementPrediction.user_data.name}</span>
                                            </div>
                                            <div className="bg-[var(--surface)] p-3 rounded-lg">
                                                <span className="text-[var(--muted)] block text-xs mb-1">Email</span>
                                                <span className="text-[var(--text)] font-medium">{engagementPrediction.user_data.email}</span>
                                            </div>
                                            <div className="bg-[var(--surface)] p-3 rounded-lg">
                                                <span className="text-[var(--muted)] block text-xs mb-1">Role</span>
                                                <span className="text-[var(--accent-primary)] font-medium capitalize">{engagementPrediction.user_data.role}</span>
                                            </div>
                                            <div className="bg-[var(--surface)] p-3 rounded-lg">
                                                <span className="text-[var(--muted)] block text-xs mb-1">Courses</span>
                                                <span className="text-[var(--text)] font-bold text-lg">{engagementPrediction.user_data.enrolled_courses || 0}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
                                        <h4 className="font-medium text-[var(--text)] mb-4 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-[var(--accent-primary)] rounded-full animate-pulse" />
                                            AI-Generated Prediction
                                        </h4>
                                        <div className="prose max-w-none">
                                            {formatMarkdown(engagementPrediction.prediction)}
                                        </div>
                                    </div>

                                    <div className="text-xs text-[var(--muted)] text-right">
                                        Generated at: {new Date(engagementPrediction.generated_at).toLocaleString()}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


