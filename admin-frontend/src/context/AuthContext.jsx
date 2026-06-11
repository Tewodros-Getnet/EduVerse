import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Defined before useEffect so it can be called inside it safely
    const logout = useCallback(async () => {
        const refreshToken = localStorage.getItem('admin_refreshToken');
        try {
            await api.post('/auth/logout', { refreshToken });
        } catch {
            // Ignore — clear local state regardless
        }
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refreshToken');
        setUser(null);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (token && token !== 'undefined' && token !== 'null') {
            // Always re-fetch full user profile on mount so avatar/bio/etc are fresh after refresh
            api.get('/auth/me')
                .then(res => {
                    if (res.data.user?.role === 'admin') {
                        setUser(res.data.user);
                    } else {
                        logout();
                    }
                })
                .catch(() => {
                    localStorage.removeItem('admin_token');
                    localStorage.removeItem('admin_refreshToken');
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [logout]);

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

    const updateUser = (updatedFields) => {
        setUser(prev => prev ? { ...prev, ...updatedFields } : prev);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
