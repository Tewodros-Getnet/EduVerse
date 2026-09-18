# Fix encoding issues in instructor pages
$files = @(
    "c:\EduVerse-main\student-frontend\src\pages\instructor\Courses.jsx",
    "c:\EduVerse-main\student-frontend\src\pages\instructor\LiveClasses.jsx",
    "c:\EduVerse-main\student-frontend\src\pages\instructor\Assessments.jsx",
    "c:\EduVerse-main\student-frontend\src\pages\instructor\Analytics.jsx",
    "c:\EduVerse-main\student-frontend\src\pages\instructor\Assignments.jsx",
    "c:\EduVerse-main\student-frontend\src\pages\instructor\AITools.jsx"
)

# Define replacements - corrupted text to proper emoji/symbol
$replacements = @{
    'ðŸ"š' = '📚'
    'ðŸŽ¥' = '🎥'
    'ðŸ"¹' = '🔹'
    'ðŸ"—' = '🔗'
    'ðŸ"Ž' = '📎'
    'âœ•' = '✕'
    'âœ"' = '✓'
    'âœï¸' = '✏️'
    'â³' = '⏳'
    'âš ' = '⚠'
    'âš ï¸' = '⚠️'
    'â€¢' = '•'
    'â€"' = '—'
    'â€' = '–'
    'â†—' = '↗'
    'â"€' = '─'
    'ðŸ"ˆ' = '📈'
    'ðŸš¨' = '🚨'
    'â­' = '⭐'
    'â–¶' = '▶'
    'â†' = '→'
}

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Processing: $file"
        $content = Get-Content $file -Raw -Encoding UTF8
        
        foreach ($key in $replacements.Keys) {
            if ($content -match [regex]::Escape($key)) {
                $content = $content -replace [regex]::Escape($key), $replacements[$key]
                Write-Host "  Replaced: $key -> $($replacements[$key])"
            }
        }
        
        $content | Set-Content $file -Encoding UTF8 -NoNewline
        Write-Host "  ✓ Done`n"
    }
}

Write-Host "All files processed!"
