/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                navy: { 900: '#0d0d1a', 800: '#12122a', 700: '#1a1a35', 600: '#22224a' },
                purple: { 500: '#7c3aed', 600: '#6d28d9' },
                pink: { 500: '#ec4899', 400: '#f472b6' },
                cyan: { 400: '#22d3ee', 500: '#06b6d4' },
            },
        },
    },
    plugins: [],
};
