import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Defined before useEffect so it can be called inside it safely
    const logout = useCallback(async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        try {
            await api.post('/auth/logout', { refreshToken });
        } catch {
            // Ignore — clear local state regardless
        }
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setUser(null);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token && token !== 'undefined' && token !== 'null') {
            // Always re-fetch full user profile on mount so avatar/bio/etc are fresh after refresh
            api.get('/auth/me')
                .then(res => setUser(res.data.user))
                .catch(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password, role) => {
        const res = await api.post('/auth/login', { email, password, role });
        localStorage.setItem('token', res.data.accessToken);
        if (res.data.refreshToken) {
            localStorage.setItem('refreshToken', res.data.refreshToken);
        }
        setUser(res.data.user);
        return res.data.user;
    };

    const register = async (name, email, password, role) => {
        const res = await api.post('/auth/register', { name, email, password, role });
        localStorage.setItem('token', res.data.accessToken);
        if (res.data.refreshToken) {
            localStorage.setItem('refreshToken', res.data.refreshToken);
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
