/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                navy: { 900: '#0d0d1a', 800: '#12122a', 700: '#1a1a35' },
            },
        },
    },
    plugins: [],
};
