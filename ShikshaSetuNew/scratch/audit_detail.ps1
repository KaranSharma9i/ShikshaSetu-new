$colors = @(
    @{hex='#0D1B2A'; name='primary'},
    @{hex='#D4AF37'; name='secondary'},
    @{hex='#162A56'; name='primaryAlt'},
    @{hex='#F2C14E'; name='secondaryLight'},
    @{hex='#0F1C2C'; name='primary-variant'},
    @{hex='#ffe088'; name='secondaryLight-variant'}
)

function Detail-File($filePath) {
    if (-not (Test-Path $filePath)) { return }
    $content = Get-Content $filePath
    $found = $false
    for ($i = 0; $i -lt $content.Length; $i++) {
        $line = $content[$i]
        foreach ($c in $colors) {
            if ($line -match [regex]::Escape($c.hex)) {
                if (-not $found) {
                    $shortPath = $filePath -replace '\\','/'
                    Write-Host "`n--- $shortPath ---"
                    $found = $true
                }
                $lineNum = $i + 1
                $trimmed = $line.Trim()
                if ($trimmed.Length -gt 100) { $trimmed = $trimmed.Substring(0,100) + "..." }
                Write-Host "  L$lineNum [$($c.name)]: $trimmed"
            }
        }
    }
}

# Sample a few partial files to see what's left
$sampleFiles = @(
    "app\index.tsx",
    "app\homework\index.tsx",
    "app\fees.tsx",
    "app\(teacher)\index.tsx",
    "app\(teacher)\teacher-homework\create.tsx",
    "app\institution\index.tsx",
    "app\institution\academics.tsx",
    "app\students\index.tsx",
    "app\teachers\index.tsx"
)

Write-Host "=== DETAILED: What hardcoded colors remain in sample files ==="
foreach ($f in $sampleFiles) {
    Detail-File $f
}
