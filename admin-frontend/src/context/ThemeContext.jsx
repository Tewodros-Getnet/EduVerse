import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'eduverse_admin_theme';

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') {
            setTheme(saved);
        } else {
            setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        }
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
