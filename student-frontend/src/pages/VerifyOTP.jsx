import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function VerifyOTP() {
    const [searchParams] = useSearchParams();
    const userId = searchParams.get('userId');
    const navigate = useNavigate();
    const { login: setUserFromTokens } = useAuth();

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [countdown, setCountdown] = useState(0); // resend cooldown
    const [isVisible, setIsVisible] = useState(false);
    const inputRefs = useRef([]);

    useEffect(() => {
        setTimeout(() => setIsVisible(true), 100);
        if (!userId) navigate('/register');
        // Focus first input on mount
        inputRefs.current[0]?.focus();
    }, [userId, navigate]);

    // Countdown timer for resend button
    useEffect(() => {
        if (countdown <= 0) return;
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    const handleChange = (index, value) => {
        // Only allow digits
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1); // take last char (handles paste into single cell)
        setOtp(newOtp);
        // Auto-advance to next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;
        const newOtp = [...otp];
        pasted.split('').forEach((char, i) => { newOtp[i] = char; });
        setOtp(newOtp);
        // Focus last filled or last input
        const lastIdx = Math.min(pasted.length, 5);
        inputRefs.current[lastIdx]?.focus();
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        const code = otp.join('');
        if (code.length < 6) return toast.error('Please enter the complete 6-digit code');
        setLoading(true);
        try {
            const res = await api.post('/auth/verify-otp', { userId, otp: code });
            const { user, accessToken, refreshToken } = res.data;

            // Store tokens using role-based keys (matches our AuthContext)
            const tokenKey = user.role === 'instructor' ? 'instructor_token' : 'student_token';
            const refreshKey = user.role === 'instructor' ? 'instructor_refreshToken' : 'student_refreshToken';
            localStorage.setItem(tokenKey, accessToken);
            if (refreshToken) localStorage.setItem(refreshKey, refreshToken);

            toast.success('Email verified! Welcome to EduVerse 🎉');
            navigate(user.role === 'student' ? '/student' : '/instructor');
            // Reload to let AuthContext pick up the new token
            window.location.reload();
        } catch (err) {
            const msg = err.response?.data?.error || 'Verification failed';
            toast.error(msg);
            if (msg.includes('expired')) {
                // Clear inputs so user can request new OTP
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            }
        } finally { setLoading(false); }
    };

    const handleResend = async () => {
        if (countdown > 0) return;
        setResending(true);
        try {
            await api.post('/auth/resend-otp', { userId });
            toast.success('New OTP sent to your email');
            setCountdown(60); // 60-second cooldown
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to resend OTP';
            toast.error(msg);
            if (err.response?.data?.retryAfterSeconds) {
                setCountdown(err.response.data.retryAfterSeconds);
            }
        } finally { setResending(false); }
    };

    return (
        <div className={`min-h-screen bg-gradient-to-br from-[#0d0d1a] via-[#1a0533] to-[#0d0d1a] flex items-center justify-center p-4 transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="text-3xl">🎓</span>
                        <span className="text-2xl font-bold text-white">EduVerse</span>
                    </div>
                    <div className="w-16 h-16 bg-purple-600/20 border-2 border-purple-500/40 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">📧</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Verify your email</h1>
                    <p className="text-gray-400 text-sm">
                        We sent a 6-digit code to your email.<br />
                        Enter it below to activate your account.
                    </p>
                </div>

                {/* OTP form */}
                <div className="bg-[#12122a]/80 border border-purple-900/40 rounded-2xl p-8">
                    <form onSubmit={handleVerify} className="space-y-6">
                        {/* 6-digit input boxes */}
                        <div className="flex justify-center gap-3" onPaste={handlePaste}>
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={el => inputRefs.current[index] = el}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={e => handleChange(index, e.target.value)}
                                    onKeyDown={e => handleKeyDown(index, e)}
                                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-200
                                        bg-[#1a1a35] text-white outline-none
                                        ${digit ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-purple-900/40'}
                                        focus:border-purple-400 focus:shadow-lg focus:shadow-purple-500/30`}
                                />
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || otp.join('').length < 6}
                            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Verifying...
                                </span>
                            ) : 'Verify Email'}
                        </button>

                        {/* Resend */}
                        <div className="text-center">
                            <p className="text-gray-400 text-sm mb-2">Didn't receive the code?</p>
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={resending || countdown > 0}
                                className="text-purple-400 hover:text-purple-300 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {resending ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                            </button>
                        </div>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => navigate('/register')}
                                className="text-gray-500 hover:text-gray-400 text-xs transition"
                            >
                                ← Back to Register
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
