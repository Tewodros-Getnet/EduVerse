import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

// Determine which localStorage key to use based on role
const getKeys = (role) => ({
    tokenKey: role === 'instructor' ? 'instructor_token' : 'student_token',
    refreshKey: role === 'instructor' ? 'instructor_refreshToken' : 'student_refreshToken',
});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(async () => {
        const refreshToken = localStorage.getItem('student_refreshToken') ||
                             localStorage.getItem('instructor_refreshToken');
        try {
            if (refreshToken) await api.post('/auth/logout', { refreshToken });
        } catch {
            // Ignore — clear local state regardless
        }
        // Clear all role-specific keys
        localStorage.removeItem('student_token');
        localStorage.removeItem('student_refreshToken');
        localStorage.removeItem('instructor_token');
        localStorage.removeItem('instructor_refreshToken');
        setUser(null);
    }, []);

    useEffect(() => {
        // Try student token first, then instructor token
        const token = localStorage.getItem('student_token') ||
                      localStorage.getItem('instructor_token');
        if (token && token !== 'undefined' && token !== 'null') {
            // Always re-fetch full user profile on mount so avatar/bio/etc are fresh after refresh
            api.get('/auth/me')
                .then(res => setUser(res.data.user))
                .catch(() => {
                    localStorage.removeItem('student_token');
                    localStorage.removeItem('student_refreshToken');
                    localStorage.removeItem('instructor_token');
                    localStorage.removeItem('instructor_refreshToken');
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password, role) => {
        const res = await api.post('/auth/login', { email, password, role });
        const { tokenKey, refreshKey } = getKeys(res.data.user.role);
        localStorage.setItem(tokenKey, res.data.accessToken);
        if (res.data.refreshToken) {
            localStorage.setItem(refreshKey, res.data.refreshToken);
        }
        setUser(res.data.user);
        return res.data.user;
    };

    const register = async (name, email, password, role) => {
        const res = await api.post('/auth/register', { name, email, password, role });
        const { tokenKey, refreshKey } = getKeys(res.data.user.role);
        localStorage.setItem(tokenKey, res.data.accessToken);
        if (res.data.refreshToken) {
            localStorage.setItem(refreshKey, res.data.refreshToken);
        }
        setUser(res.data.user);
        return res.data.user;
    };

    // Allow profile pages to update the in-memory user without a full re-fetch
    const updateUser = useCallback((updatedFields) => {
        setUser(prev => prev ? { ...prev, ...updatedFields } : prev);
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, register, logout, updateUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
