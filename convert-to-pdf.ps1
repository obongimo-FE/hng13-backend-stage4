# PowerShell Script to Convert Markdown Files to PDF
# Usage: .\convert-to-pdf.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Markdown to PDF Converter" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if md-to-pdf is installed
$mdToPdfInstalled = Get-Command md-to-pdf -ErrorAction SilentlyContinue

if (-not $mdToPdfInstalled) {
    Write-Host "md-to-pdf not found. Installing..." -ForegroundColor Yellow
    npm install -g md-to-pdf
    Write-Host "✓ md-to-pdf installed" -ForegroundColor Green
}

# Check if mermaid-cli is installed
$mermaidInstalled = Get-Command mmdc -ErrorAction SilentlyContinue

if (-not $mermaidInstalled) {
    Write-Host "mermaid-cli not found. Installing..." -ForegroundColor Yellow
    npm install -g @mermaid-js/mermaid-cli
    Write-Host "✓ mermaid-cli installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "Files to convert:" -ForegroundColor Cyan

# List of files to convert
$files = @(
    "EXECUTIVE_SUMMARY.md",
    "SMART_COMB_TECHNICAL_DOCUMENTATION.md",
    "SYSTEM_DIAGRAMS.md",
    "README.md"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file (not found)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Starting conversion..." -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Converting: $file" -ForegroundColor Yellow
        
        try {
            # Convert with Mermaid support
            md-to-pdf --mermaid $file
            
            if ($LASTEXITCODE -eq 0) {
                $pdfFile = $file -replace '\.md$', '.pdf'
                Write-Host "  ✓ Success: $pdfFile created" -ForegroundColor Green
                $successCount++
            } else {
                Write-Host "  ✗ Failed to convert $file" -ForegroundColor Red
                $failCount++
            }
        } catch {
            Write-Host "  ✗ Error: $_" -ForegroundColor Red
            $failCount++
        }
        
        Write-Host ""
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Conversion Complete!" -ForegroundColor Cyan
Write-Host "  Success: $successCount" -ForegroundColor Green
Write-Host "  Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
Write-Host "========================================" -ForegroundColor Cyan

if ($successCount -gt 0) {
    Write-Host ""
    Write-Host "PDF files created in current directory:" -ForegroundColor Cyan
    Get-ChildItem *.pdf | ForEach-Object {
        Write-Host "  • $($_.Name)" -ForegroundColor Green
    }
}

