import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (token) {
            api.get('/auth/me')
                .then(res => {
                    if (res.data.user.role === 'admin') setUser(res.data.user);
                    else logout();
                })
                .catch(() => {
                    localStorage.removeItem('admin_token');
                    localStorage.removeItem('admin_refreshToken');
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password, role: 'admin' });
        if (res.data.user.role !== 'admin') throw new Error('Not an admin account');
        localStorage.setItem('admin_token', res.data.accessToken);
        if (res.data.refreshToken) {
            localStorage.setItem('admin_refreshToken', res.data.refreshToken);
        }
        setUser(res.data.user);
        return res.data.user;
    };

    const logout = async () => {
        const refreshToken = localStorage.getItem('admin_refreshToken');
        try {
            await api.post('/auth/logout', { refreshToken });
        } catch {
            // Ignore — clear local state regardless
        }
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refreshToken');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
