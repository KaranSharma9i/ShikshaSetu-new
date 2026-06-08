$colors = @('#0D1B2A','#D4AF37','#162A56','#F2C14E','#0F1C2C','#ffe088')
$themePattern = 'theme\?\.'

function Audit-Files($label, $files) {
    Write-Host ""
    Write-Host "=== $label ==="
    Write-Host ("File".PadRight(50) + "HC".PadRight(6) + "Theme".PadRight(8) + "Status")
    Write-Host ("-" * 80)
    $done = 0; $partial = 0; $notStarted = 0; $total = 0
    foreach ($f in $files) {
        if (Test-Path $f) {
            $total++
            $content = Get-Content $f -Raw
            $hardcodedCount = 0
            foreach ($c in $colors) {
                $m = [regex]::Matches($content, [regex]::Escape($c), 'IgnoreCase')
                $hardcodedCount += $m.Count
            }
            $usesTheme = if ($content -match $themePattern) { "Y" } else { "N" }
            if ($hardcodedCount -eq 0 -and $usesTheme -eq "Y") {
                $status = "DONE"; $done++
            } elseif ($hardcodedCount -eq 0) {
                $status = "CLEAN"; $done++
            } elseif ($usesTheme -eq "Y") {
                $status = "PARTIAL"; $partial++
            } else {
                $status = "NOT STARTED"; $notStarted++
            }
            $shortName = $f -replace '\\','/'
            Write-Host ($shortName.PadRight(50) + $hardcodedCount.ToString().PadRight(6) + $usesTheme.PadRight(8) + $status)
        }
    }
    Write-Host ""
    Write-Host "  Total: $total | Done: $done | Partial: $partial | Not Started: $notStarted"
    Write-Host ("  Completion: " + [math]::Round(($done / [math]::Max($total,1)) * 100) + "%")
}

# SUB-BATCH 5a: Student Portal
$studentFiles = @(
    "app\index.tsx",
    "app\homework\index.tsx",
    "app\homework\[id].tsx",
    "app\homework\score\[id].tsx",
    "app\circulars.tsx",
    "app\fees.tsx",
    "app\report-card.tsx",
    "app\schedule.tsx",
    "app\timetable.tsx",
    "app\profile\index.tsx",
    "app\profile\edit.tsx",
    "app\profile\update-password.tsx",
    "app\students\index.tsx",
    "app\students\[id].tsx",
    "app\teachers\index.tsx",
    "app\teachers\[id].tsx"
)
Audit-Files "SUB-BATCH 5a: STUDENT PORTAL SCREENS" $studentFiles

# SUB-BATCH 5b: Teacher Portal
$teacherFiles = @(
    "app\(teacher)\index.tsx",
    "app\(teacher)\_layout.tsx",
    "app\(teacher)\more\index.tsx",
    "app\(teacher)\more\circulars.tsx",
    "app\(teacher)\more\edit.tsx",
    "app\(teacher)\more\exams.tsx",
    "app\(teacher)\more\marks.tsx",
    "app\(teacher)\more\timetable.tsx",
    "app\(teacher)\more\update-password.tsx",
    "app\(teacher)\teacher-homework\index.tsx",
    "app\(teacher)\teacher-homework\[id].tsx",
    "app\(teacher)\teacher-homework\create.tsx",
    "app\(teacher)\teacher-homework\preview.tsx",
    "app\(teacher)\teacher-homework\published.tsx",
    "app\(teacher)\teacher-students\index.tsx",
    "app\(teacher)\teacher-students\[id].tsx"
)
Audit-Files "SUB-BATCH 5b: TEACHER PORTAL SCREENS" $teacherFiles

# SUB-BATCH 5c: Institution Portal
$institutionFiles = @(
    "app\institution\index.tsx",
    "app\institution\_layout.tsx",
    "app\institution\academics.tsx",
    "app\institution\attendance.tsx",
    "app\institution\circulars.tsx",
    "app\institution\events.tsx",
    "app\institution\fees.tsx",
    "app\institution\register.tsx",
    "app\institution\update-password.tsx",
    "app\institution\utilities.tsx"
)
Audit-Files "SUB-BATCH 5c: INSTITUTION PORTAL SCREENS" $institutionFiles
