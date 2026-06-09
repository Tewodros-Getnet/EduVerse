import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
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

    const logout = async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        try {
            // Tell the server to revoke this refresh token
            await api.post('/auth/logout', { refreshToken });
        } catch {
            // Ignore — clear local state regardless
        }
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setUser(null);
    };

    // Allow profile pages to update the in-memory user without a full re-fetch
    const updateUser = (updatedFields) => {
        setUser(prev => prev ? { ...prev, ...updatedFields } : prev);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, updateUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
