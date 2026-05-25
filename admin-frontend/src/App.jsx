import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import CourseManagement from './pages/CourseManagement';
import NotificationManager from './pages/NotificationManager';
import SecurityManager from './pages/SecurityManager';
import AIManager from './pages/AIManager';
import Analytics from './pages/Analytics';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return (
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
    return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="courses" element={<CourseManagement />} />
                <Route path="notifications" element={<NotificationManager />} />
                <Route path="security" element={<SecurityManager />} />
                <Route path="ai" element={<AIManager />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="settings" element={<Settings />} />
            </Route>
        </Routes>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a35', color: '#fff', border: '1px solid #7c3aed' } }} />
                <AppRoutes />
            </ThemeProvider>
        </AuthProvider>
    );
}
