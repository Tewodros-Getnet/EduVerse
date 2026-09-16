import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, BookOpen, Calendar, Star, FileCheck, MessageCircle } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function AllAssignments() {
    const [assignments,  setAssignments]  = useState([]);
    const [submissions,  setSubmissions]  = useState({}); // { [assignment_id]: submission }
    const [loading,      setLoading]      = useState(true);
    const [filter,       setFilter]       = useState('all'); // all | pending | submitted | graded | overdue
    const [sortBy,       setSortBy]       = useState('due_date');

    useEffect(() => {
        const fetchAll = async () => {
            try {
                // Fetch enrolled courses, all submissions in parallel
                const [coursesRes, subRes] = await Promise.all([
                    api.get('/courses/my/enrolled'),
                    api.get('/assignments/student/submissions'),
                ]);

                const coursesData = coursesRes.data.courses || [];

                // Build submission map keyed by assignment_id
                const subMap = {};
                (subRes.data.submissions || []).forEach(s => { subMap[s.assignment_id] = s; });
                setSubmissions(subMap);

                // Fetch assignments for each enrolled course
                const results = await Promise.all(
                    coursesData.map(c =>
                        api.get(`/assignments/course/${c.id}`)
                            .then(r => ({ data: r.data, course: c }))
                            .catch(() => ({ data: [], course: c }))
                    )
                );

                const all = results.flatMap(({ data, course }) =>
                    (Array.isArray(data) ? data : data.assignments || []).map(a => ({
                        ...a,
                        course_title: course.title,
                        course_id:    course.id,
                    }))
                );

                setAssignments(all);
            } catch {
                toast.error('Failed to load assignments');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    // ── Status helpers ─────────────────────────────────────────────────────
    const getStatus = (assignment) => {
        const sub = submissions[assignment.id];
        if (!sub) {
            return new Date(assignment.due_date) < new Date() ? 'overdue' : 'pending';
        }
        if (sub.score !== null) return 'graded';
        return 'submitted';
    };

    const STATUS_CONFIG = {
        pending:   { label: 'Pending',   classes: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
        overdue:   { label: 'Overdue',   classes: 'bg-red-500/20    text-red-300    border-red-500/30'    },
        submitted: { label: 'Submitted', classes: 'bg-blue-500/20   text-blue-300   border-[var(--accent-tertiary)]/30'   },
        graded:    { label: 'Graded',    classes: 'bg-green-500/20  text-green-300  border-green-500/30'  },
    };

    const getDaysUntilDue = (dueDate) => {
        const diffDays = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0)  return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
        if (diffDays === 0) return 'Due today';
        if (diffDays === 1) return 'Due tomorrow';
        return `Due in ${diffDays} days`;
    };

    // ── Filter + sort ──────────────────────────────────────────────────────
    const filtered = assignments
        .filter(a => filter === 'all' || getStatus(a) === filter)
        .sort((a, b) => {
            if (sortBy === 'title')  return a.title.localeCompare(b.title);
            if (sortBy === 'points') return b.max_points - a.max_points;
            if (sortBy === 'course') return (a.course_title || '').localeCompare(b.course_title || '');
            return new Date(a.due_date) - new Date(b.due_date); // due_date default
        });

    // Summary counts
    const counts = assignments.reduce((acc, a) => {
        acc[getStatus(a)] = (acc[getStatus(a)] || 0) + 1;
        return acc;
    }, {});

    // ── Render ─────────────────────────────────────────────────────────────
    if (loading) return <div className="text-center py-20 text-[var(--muted)]">Loading assignments...</div>;

    if (assignments.length === 0) {
        return (
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-[var(--text)] mb-6">All Assignments</h1>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center text-[var(--muted)]">
                    <div className="flex justify-center mb-3">
                        <ClipboardList className="w-10 h-10 text-[var(--muted)]" />
                    </div>
                    <p className="text-[var(--text)] font-medium mb-2">No assignments yet</p>
                    <p className="text-sm mb-4">Enroll in a course to start receiving assignments</p>
                    <Link to="/student/courses"
                        className="px-4 py-2 bg-[var(--accent-primary)] rounded-xl text-[var(--text)] text-sm hover:bg-purple-700 transition">
                        Browse Courses
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-bold text-[var(--text)]">All Assignments</h1>
                <p className="text-sm text-[var(--muted)]">{assignments.length} total</p>
            </div>

            {/* Summary stat pills */}
            <div className="flex gap-3 flex-wrap">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    counts[key] ? (
                        <button key={key}
                            onClick={() => setFilter(filter === key ? 'all' : key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                                filter === key
                                    ? cfg.classes + ' ring-2 ring-offset-1 ring-offset-[var(--bg)]'
                                    : cfg.classes
                            }`}>
                            {cfg.label}: {counts[key]}
                        </button>
                    ) : null
                ))}
                {filter !== 'all' && (
                    <button onClick={() => setFilter('all')}
                        className="px-3 py-1.5 rounded-full text-xs font-medium border bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)] hover:text-[var(--text)] transition">
                        Show All
                    </button>
                )}
            </div>

            {/* Sort bar */}
            <div className="flex gap-3 flex-wrap">
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text)] text-sm">
                    <option value="due_date">Sort by Due Date</option>
                    <option value="title">Sort by Title</option>
                    <option value="course">Sort by Course</option>
                    <option value="points">Sort by Points</option>
                </select>
            </div>

            {filtered.length === 0 ? (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center text-[var(--muted)]">
                    No assignments match this filter
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(assignment => {
                        const status = getStatus(assignment);
                        const sub    = submissions[assignment.id];
                        const cfg    = STATUS_CONFIG[status];

                        return (
                            <div key={assignment.id}
                                className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        {/* Title + badge */}
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <h3 className="font-semibold text-[var(--text)]">{assignment.title}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.classes}`}>
                                                {cfg.label}
                                                {status === 'graded' && sub?.score !== null &&
                                                    ` — ${sub.score}/${assignment.max_points}`}
                                            </span>
                                        </div>

                                        {/* Course */}
                                        <p className="text-xs text-[var(--accent-primary)] mb-2 flex items-center gap-1">
                                            <BookOpen className="w-3 h-3" /> {assignment.course_title}
                                        </p>

                                        {/* Description snippet */}
                                        {assignment.description && (
                                            <p className="text-xs text-[var(--muted)] mb-2 line-clamp-2">{assignment.description}</p>
                                        )}

                                        {/* Meta row */}
                                        <div className="flex items-center gap-4 text-xs text-[var(--muted)] flex-wrap">
                                            <span className={new Date(assignment.due_date) < new Date() && !sub ? 'text-red-400' : ''} title="Due date">
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {getDaysUntilDue(assignment.due_date)}</span>
                                            </span>
                                            <span title="Points" className="flex items-center gap-1"><Star className="w-3 h-3" /> {assignment.max_points} pts</span>
                                            {sub && (
                                                <span title="Submitted" className="flex items-center gap-1"><FileCheck className="w-3 h-3" /> Submitted {new Date(sub.submitted_at).toLocaleDateString()}</span>
                                            )}
                                        </div>

                                        {/* Feedback preview */}
                                        {sub?.feedback && (
                                            <div className="mt-2 text-xs text-blue-300 flex items-start gap-1">
                                                <MessageCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                                <span className="text-[var(--muted)] line-clamp-1">{sub.feedback}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Grade display */}
                                    {status === 'graded' && sub?.score !== null && (
                                        <div className="text-right flex-shrink-0">
                                            <div className={`text-2xl font-bold ${
                                                (sub.score / assignment.max_points) >= 0.8 ? 'text-green-400' :
                                                (sub.score / assignment.max_points) >= 0.6 ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                                {Math.round((sub.score / assignment.max_points) * 100)}%
                                            </div>
                                            <div className="text-xs text-[var(--muted)]">{sub.score}/{assignment.max_points}</div>
                                        </div>
                                    )}
                                </div>

                                {/* Action button */}
                                <div className="mt-4">
                                    <Link to={`/student/assignments/${assignment.course_id}`}
                                        className={`inline-block w-full text-center py-2.5 rounded-xl text-sm font-medium transition ${
                                            status === 'pending' || status === 'overdue'
                                                ? status === 'overdue'
                                                    ? 'bg-red-600/30 border border-red-500/30 text-red-300 hover:bg-red-600/40'
                                                    : 'bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] text-[var(--text)] hover:opacity-90'
                                                : 'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--accent-primary)]/80 dark:text-[var(--accent-primary)] hover:bg-[var(--surface-3)]'
                                        }`}>
                                        {status === 'pending'   && 'Submit Assignment →'}
                                        {status === 'overdue'   && 'Submit (Late) →'}
                                        {status === 'submitted' && 'View Submission →'}
                                        {status === 'graded'    && 'View Feedback →'}
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}





