const fs = require('fs');
const path = require('path');

const files = [
    'c:/EduVerse-main/student-frontend/src/pages/instructor/Courses.jsx',
    'c:/EduVerse-main/student-frontend/src/pages/instructor/LiveClasses.jsx',
    'c:/EduVerse-main/student-frontend/src/pages/instructor/Assessments.jsx',
    'c:/EduVerse-main/student-frontend/src/pages/instructor/Analytics.jsx',
    'c:/EduVerse-main/student-frontend/src/pages/instructor/Assignments.jsx',
    'c:/EduVerse-main/student-frontend/src/pages/instructor/AITools.jsx'
];

// These are the corrupted patterns to fix
const replacements = [
    // Book emoji
    { from: 'ðŸ"š', to: '📚' },
    // Video camera
    { from: 'ðŸŽ¥', to: '🎥' },
    // Link
    { from: 'ðŸ"—', to: '🔗' },
    // Red button
    { from: 'ðŸ"¹', to: '🔹' },
    // Paperclip
    { from: 'ðŸ"Ž', to: '📎' },
    // X mark
    { from: 'âœ•', to: '✕' },
    // Check mark
    { from: 'âœ"', to: '✓' },
    // Pencil
    { from: 'âœï¸', to: '✏️' },
    // Hourglass
    { from: 'â³', to: '⏳' },
    // Warning
    { from: 'âš ', to: '⚠' },
    { from: 'âš ï¸', to: '⚠️' },
    // Bullet point
    { from: 'â€¢', to: '•' },
    // Em dash
    { from: 'â€"', to: '—' },
    // En dash
    { from: 'â€', to: '–' },
    // Arrow
    { from: 'â†—', to: '↗' },
    { from: 'â†', to: '→' },
    // Box drawing
    { from: 'â"€', to: '─' },
    // Chart emoji
    { from: 'ðŸ"ˆ', to: '📈' },
    // Siren emoji
    { from: 'ðŸš¨', to: '🚨' },
    // Star
    { from: 'â­', to: '⭐' },
    // Play button
    { from: 'â–¶', to: '▶' }
];

files.forEach(filePath => {
    if (fs.existsSync(filePath)) {
        console.log(`Processing: ${filePath}`);
        let content = fs.readFileSync(filePath, 'utf8');
        let changed = false;
        
        replacements.forEach(({ from, to }) => {
            if (content.includes(from)) {
                content = content.split(from).join(to);
                console.log(`  Replaced: ${from} -> ${to}`);
                changed = true;
            }
        });
        
        if (changed) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`  ✓ Saved\n`);
        } else {
            console.log(`  No changes needed\n`);
        }
    } else {
        console.log(`  ✗ File not found\n`);
    }
});

console.log('All files processed!');
