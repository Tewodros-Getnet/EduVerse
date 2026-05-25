import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function CourseNotes() {
    const { courseId } = useParams();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [courseName, setCourseName] = useState('');

    useEffect(() => {
        Promise.all([
            api.get(`/assessments/course/${courseId}/notes`),
            api.get(`/courses/${courseId}`),
        ]).then(([notesRes, courseRes]) => {
            setNotes(notesRes.data.notes || []);
            setCourseName(courseRes.data.course?.title || 'Course');
        }).catch(() => toast.error('Failed to load notes'))
            .finally(() => setLoading(false));
    }, [courseId]);

    if (loading) return <div className="text-center py-20 text-gray-400">Loading notes...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-white">Course Notes - {courseName}</h1>

            {notes.length === 0 ? (
                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-8 text-center text-gray-400">
                    No notes available yet. Check back for instructor updates!
                </div>
            ) : (
                <div className="space-y-4">
                    {notes.map(note => (
                        <div key={note.id} className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-white">{note.title}</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        By {note.instructor_name} • {new Date(note.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                {!note.is_public && (
                                    <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full">Private</span>
                                )}
                            </div>
                            <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                                {note.content}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
