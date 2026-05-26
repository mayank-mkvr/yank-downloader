$ErrorActionPreference = "Stop"

Write-Host "Checking Node.js..." -ForegroundColor Cyan
$env:Path = "C:\Program Files\nodejs;$env:Path"
$nodeVersion = & node --version
Write-Host "Node.js $nodeVersion found" -ForegroundColor Green

cd h:\ytdownloader
Write-Host "`nBuilding YT Downloader .exe..." -ForegroundColor Cyan

if (-not (Test-Path "dist")) {
    New-Item -ItemType Directory -Path "dist" -Force | Out-Null
}

Write-Host "Installing pkg..." -ForegroundColor Yellow
& npm install -g pkg 2>&1 | Out-Null

Write-Host "Building executable..." -ForegroundColor Yellow

try {
    & npx pkg . --targets win-x64 --output dist/ytdownloader.exe --compress Brotli 2>&1 | Out-Null
} catch {
    Write-Host "Retrying..." -ForegroundColor Yellow
    & npx pkg . --targets win-x64 --output dist/ytdownloader.exe 2>&1 | Out-Null
}

if (Test-Path "dist/ytdownloader.exe") {
    $exeSize = (Get-Item "dist/ytdownloader.exe").Length / 1MB
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "EXE FILE CREATED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    Write-Host "File: dist/ytdownloader.exe" -ForegroundColor Cyan
    Write-Host "Size: $([math]::Round($exeSize, 2)) MB" -ForegroundColor Cyan
    Write-Host "`nReady for download!" -ForegroundColor White
} else {
    Write-Host "`nFailed to create exe file" -ForegroundColor Red
    exit 1
}
