import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';

export default function LessonForm({ lesson, onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        title: lesson?.title || '',
        text_content: lesson?.text_content || '',
        content_type: lesson?.content_type || 'text',
        video_url: lesson?.video_url || '',
        pdf_url: lesson?.pdf_url || '',
        duration_minutes: lesson?.duration_minutes || ''
    });

    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [uploadingPdf, setUploadingPdf] = useState(false);
    const videoInputRef = useRef(null);
    const pdfInputRef = useRef(null);

    const handleFileUpload = async (file, fileType) => {
        if (!file) return;

        // Validate file size (50MB for video, 20MB for PDF)
        const maxSize = fileType === 'video' ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error(`File size exceeds ${fileType === 'video' ? '50MB' : '20MB'} limit`);
            return;
        }

        const formDataObj = new FormData();
        formDataObj.append('file', file);
        formDataObj.append('type', fileType);

        try {
            if (fileType === 'video') {
                setUploadingVideo(true);
            } else {
                setUploadingPdf(true);
            }

            const res = await api.post('/lessons/upload', formDataObj, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const urlField = fileType === 'video' ? 'video_url' : 'pdf_url';
            setFormData(prev => {
                const isText = prev.content_type === 'text';
                const hasVideo = urlField === 'video_url' ? true : prev.video_url;
                const hasPdf = urlField === 'pdf_url' ? true : prev.pdf_url;
                const newContentType = (hasVideo && hasPdf) ? 'mixed' : (hasVideo ? 'video' : hasPdf ? 'pdf' : 'text');
                return {
                    ...prev,
                    [urlField]: res.data.url,
                    content_type: isText ? fileType : newContentType
                };
            });
            toast.success(`${fileType.toUpperCase()} uploaded successfully`);
        } catch (error) {
            toast.error(`Failed to upload ${fileType}`);
        } finally {
            if (fileType === 'video') {
                setUploadingVideo(false);
            } else {
                setUploadingPdf(false);
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            toast.error('Lesson title is required');
            return;
        }

        // Validate content based on type
        if (formData.content_type === 'video' && !formData.video_url) {
            toast.error('Please provide a video URL or upload a video file');
            return;
        }
        if (formData.content_type === 'pdf' && !formData.pdf_url) {
            toast.error('Please provide a PDF URL or upload a document');
            return;
        }
        if (formData.content_type === 'mixed') {
            if (!formData.video_url || !formData.pdf_url) {
                toast.error('Please include both a video URL/upload and a PDF URL/upload for mixed content');
                return;
            }
        }
        if (formData.content_type === 'text' && !formData.text_content.trim()) {
            toast.error('Please enter the lesson text content');
            return;
        }

        onSubmit(formData);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="bg-gradient-to-br from-[#1a1a35] to-[#12122a] rounded-2xl p-6 mb-4 border border-purple-900/30 shadow-xl">
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-6">
                {lesson ? '✏️ Edit Lesson' : '📚 Create New Lesson'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Lesson Title *
                    </label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        className="w-full bg-[#0d0d1a] border border-purple-900/40 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        placeholder="Enter lesson title"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Content Type
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['text', 'video', 'pdf', 'mixed'].map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setFormData({ ...formData, content_type: type })}
                                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${formData.content_type === type
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                                    : 'bg-[#0d0d1a] border border-purple-900/40 text-gray-400 hover:border-purple-500/50 hover:text-white'
                                    }`}
                            >
                                {type === 'text' && '📝 Text'}
                                {type === 'video' && '🎬 Video'}
                                {type === 'pdf' && '📄 PDF'}
                                {type === 'mixed' && '🎯 Mixed'}
                            </button>
                        ))}
                    </div>
                </div>

                {(formData.content_type === 'video' || formData.content_type === 'mixed') && (
                    <div className="bg-[#0d0d1a] rounded-xl p-4 border border-purple-900/30">
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                            🎬 Video Content
                        </label>
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    name="video_url"
                                    value={formData.video_url}
                                    onChange={handleChange}
                                    className="flex-1 bg-[#1a1a35] border border-purple-900/40 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 transition"
                                    placeholder="https://youtube.com/watch?v=... or /uploads/your-video.mp4"
                                />
                                <button
                                    type="button"
                                    onClick={() => videoInputRef.current?.click()}
                                    disabled={uploadingVideo}
                                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50 shadow-lg shadow-purple-500/25"
                                >
                                    {uploadingVideo ? '⏳ Uploading...' : '📤 Upload'}
                                </button>
                            </div>
                            <input
                                ref={videoInputRef}
                                type="file"
                                accept="video/*,.mp4,.webm,.mov"
                                onChange={(e) => handleFileUpload(e.target.files?.[0], 'video')}
                                className="hidden"
                            />
                            {formData.video_url && (
                                <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">
                                    <span className="text-green-400">✓</span>
                                    <span>Video added successfully</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {(formData.content_type === 'pdf' || formData.content_type === 'mixed') && (
                    <div className="bg-[#0d0d1a] rounded-xl p-4 border border-purple-900/30">
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                            📄 Document (PDF/DOC)
                        </label>
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    name="pdf_url"
                                    value={formData.pdf_url}
                                    onChange={handleChange}
                                    className="flex-1 bg-[#1a1a35] border border-purple-900/40 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 transition"
                                    placeholder="https://example.com/document.pdf or /uploads/your-doc.pdf"
                                />
                                <button
                                    type="button"
                                    onClick={() => pdfInputRef.current?.click()}
                                    disabled={uploadingPdf}
                                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50 shadow-lg shadow-purple-500/25"
                                >
                                    {uploadingPdf ? '⏳ Uploading...' : '📤 Upload'}
                                </button>
                            </div>
                            <input
                                ref={pdfInputRef}
                                type="file"
                                accept=".pdf,.doc,.docx,.txt"
                                onChange={(e) => handleFileUpload(e.target.files?.[0], 'pdf')}
                                className="hidden"
                            />
                            {formData.pdf_url && (
                                <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">
                                    <span className="text-green-400">✓</span>
                                    <span>Document added successfully</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {(formData.content_type === 'text' || formData.content_type === 'mixed') && (
                    <div className="bg-[#0d0d1a] rounded-xl p-4 border border-purple-900/30">
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                            📝 Text Content
                        </label>
                        <textarea
                            name="text_content"
                            value={formData.text_content}
                            onChange={handleChange}
                            rows={6}
                            className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                            placeholder="Enter your lesson content here..."
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                        ⏱️ Duration (minutes)
                    </label>
                    <input
                        type="number"
                        name="duration_minutes"
                        value={formData.duration_minutes}
                        onChange={handleChange}
                        className="w-full bg-[#0d0d1a] border border-purple-900/40 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        placeholder="e.g., 30"
                        min="1"
                    />
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        type="submit"
                        className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold hover:opacity-90 transition shadow-lg shadow-purple-500/25"
                    >
                        {lesson ? '💾 Update Lesson' : '✨ Create Lesson'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-3 bg-[#0d0d1a] border border-gray-600/40 rounded-xl text-gray-300 font-semibold hover:bg-gray-800/50 hover:text-white transition"
                    >
                        ← Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
