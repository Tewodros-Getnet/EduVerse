import React, { useState, useEffect, useRef } from 'react';
import { Camera, Save, Lock, User, Mail, BookOpen, Users, TrendingUp, Calendar, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function InstructorProfile() {
    const { user, updateUser } = useAuth();
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({ name: '', bio: '' });
    const [formLoading, setFormLoading] = useState(false);

    const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [pwLoading, setPwLoading] = useState(false);
    const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

    const [avatarLoading, setAvatarLoading] = useState(false);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (user) setForm({ name: user.name || '', bio: user.bio || '' });
    }, [user]);

    useEffect(() => {
        api.get('/analytics/instructor/dashboard')
            .then(res => setStats(res.data))
            .catch(() => {});
    }, []);

    const handleAvatarClick = () => fileInputRef.current?.click();

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Only JPG, PNG, WebP, or GIF images are allowed');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be smaller than 5 MB');
            return;
        }

        setAvatarLoading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const res = await api.post('/users/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            updateUser({ avatar_url: res.data.user.avatar_url });
            toast.success('Profile picture updated!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to upload image');
        } finally {
            setAvatarLoading(false);
            e.target.value = '';
        }
    };

    const handleProfileSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { toast.error('Name cannot be empty'); return; }
        setFormLoading(true);
        try {
            const res = await api.put('/users/profile', { name: form.name.trim(), bio: form.bio });
            updateUser({ name: res.data.user.name, bio: res.data.user.bio });
            toast.success('Profile updated!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update profile');
        } finally {
            setFormLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (pwForm.new_password !== pwForm.confirm_password) {
            toast.error('New passwords do not match');
            return;
        }
        if (pwForm.new_password.length < 8) {
            toast.error('New password must be at least 8 characters');
            return;
        }
        setPwLoading(true);
        try {
            await api.post('/users/change-password', {
                current_password: pwForm.current_password,
                new_password: pwForm.new_password,
            });
            toast.success('Password changed successfully!');
            setPwForm({ current_password: '', new_password: '', confirm_password: '' });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to change password');
        } finally {
            setPwLoading(false);
        }
    };

    const avatarSrc = user?.avatar_url;
    const initials = user?.name?.[0]?.toUpperCase() || '?';

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[var(--text)]">My Profile</h1>
                <p className="text-sm text-[var(--muted)] mt-1">Manage your instructor account and security settings</p>
            </div>

            {/* Avatar + info card */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-purple-500/30">
                            {avatarSrc ? (
                                <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold">
                                    {initials}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleAvatarClick}
                            disabled={avatarLoading}
                            className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 hover:bg-purple-500 rounded-full flex items-center justify-center text-white shadow-lg transition disabled:opacity-60"
                            title="Change profile picture"
                        >
                            {avatarLoading
                                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : <Camera className="w-4 h-4" />
                            }
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center sm:text-left">
                        <h2 className="text-xl font-bold text-[var(--text)]">{user?.name}</h2>
                        <p className="text-sm text-[var(--muted)]">{user?.email}</p>
                        <span className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 capitalize">
                            {user?.role}
                        </span>
                        {user?.bio && (
                            <p className="mt-2 text-sm text-[var(--text)] leading-relaxed">{user.bio}</p>
                        )}
                    </div>
                </div>

                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[var(--border)]">
                        <StatPill icon={BookOpen} label="Courses" value={stats.total_courses} color="purple" />
                        <StatPill icon={Users} label="Students" value={stats.total_students} color="blue" />
                        <StatPill icon={TrendingUp} label="Engagement" value={`${Math.round(stats.avg_engagement)}%`} color="green" />
                        <StatPill icon={DollarSign} label="Revenue" value={`$${Math.round(stats.total_revenue)}`} color="yellow" />
                    </div>
                )}
            </div>

            {/* Edit profile */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
                <h3 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-400" /> Personal Information
                </h3>
                <form onSubmit={handleProfileSave} className="space-y-4">
                    <div>
                        <label className="block text-sm text-[var(--muted)] mb-1">Full Name</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                            placeholder="Your full name"
                            maxLength={100}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--muted)] mb-1">Email</label>
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] opacity-60">
                            <Mail className="w-4 h-4 text-[var(--muted)]" />
                            <span className="text-sm text-[var(--text)]">{user?.email}</span>
                        </div>
                        <p className="text-xs text-[var(--muted)] mt-1">Email cannot be changed here</p>
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--muted)] mb-1">
                            Bio <span className="text-xs">(shown on your course pages)</span>
                        </label>
                        <textarea
                            value={form.bio}
                            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                            rows={3}
                            maxLength={300}
                            className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition resize-none"
                            placeholder="Describe your expertise and teaching style..."
                        />
                        <p className="text-xs text-[var(--muted)] text-right mt-0.5">{form.bio.length}/300</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="submit"
                            disabled={formLoading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
                        >
                            {formLoading
                                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : <Save className="w-4 h-4" />
                            }
                            Save Changes
                        </button>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                            <Calendar className="w-3.5 h-3.5" />
                            Member since {new Date(user?.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                </form>
            </div>

            {/* Change password */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
                <h3 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-400" /> Change Password
                </h3>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                    {[
                        { key: 'current', label: 'Current Password', field: 'current_password' },
                        { key: 'new', label: 'New Password', field: 'new_password' },
                        { key: 'confirm', label: 'Confirm New Password', field: 'confirm_password' },
                    ].map(({ key, label, field }) => (
                        <div key={key}>
                            <label className="block text-sm text-[var(--muted)] mb-1">{label}</label>
                            <div className="relative">
                                <input
                                    type={showPw[key] ? 'text' : 'password'}
                                    value={pwForm[field]}
                                    onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))}
                                    className="w-full px-4 py-2.5 pr-12 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                                    placeholder="••••••••"
                                    autoComplete={key === 'current' ? 'current-password' : 'new-password'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(s => ({ ...s, [key]: !s[key] }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] text-xs transition"
                                >
                                    {showPw[key] ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            {field === 'new_password' && pwForm.new_password && (
                                <PasswordStrength password={pwForm.new_password} />
                            )}
                            {field === 'confirm_password' && pwForm.confirm_password && (
                                <p className={`text-xs mt-1 flex items-center gap-1 ${pwForm.new_password === pwForm.confirm_password ? 'text-green-400' : 'text-red-400'}`}>
                                    {pwForm.new_password === pwForm.confirm_password
                                        ? <><CheckCircle className="w-3 h-3" /> Passwords match</>
                                        : <><AlertCircle className="w-3 h-3" /> Passwords don't match</>
                                    }
                                </p>
                            )}
                        </div>
                    ))}
                    <button
                        type="submit"
                        disabled={pwLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
                    >
                        {pwLoading
                            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Lock className="w-4 h-4" />
                        }
                        Update Password
                    </button>
                </form>
            </div>
        </div>
    );
}

function StatPill({ icon: Icon, label, value, color }) {
    const colors = {
        blue: 'bg-blue-500/10 text-blue-400',
        green: 'bg-green-500/10 text-green-400',
        purple: 'bg-purple-500/10 text-purple-400',
        yellow: 'bg-yellow-500/10 text-yellow-400',
    };
    return (
        <div className={`rounded-xl p-3 ${colors[color]} flex flex-col items-center gap-1`}>
            <Icon className="w-4 h-4" />
            <span className="text-lg font-bold">{value}</span>
            <span className="text-xs opacity-70">{label}</span>
        </div>
    );
}

function PasswordStrength({ password }) {
    const score = [
        password.length >= 8,
        /[A-Z]/.test(password),
        /[0-9]/.test(password),
        /[^A-Za-z0-9]/.test(password),
    ].filter(Boolean).length;

    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

    return (
        <div className="mt-1.5">
            <div className="flex gap-1">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= score ? colors[score] : 'bg-[var(--border)]'}`} />
                ))}
            </div>
            <p className="text-xs text-[var(--muted)] mt-0.5">{labels[score]}</p>
        </div>
    );
}
