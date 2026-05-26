@echo off
setlocal enabledelayedexpansion
title YT Downloader - Complete Installer

cd /d "%~dp0"

echo.
echo ========================================
echo   YT DOWNLOADER - INSTALLER
echo ========================================
echo.

REM Add Node.js path
set PATH=C:\Program Files\nodejs;%PATH%

REM Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo Installing Node.js...
    powershell -ExecutionPolicy Bypass -Command "winget install OpenJS.NodeJS --silent"
    set PATH=C:\Program Files\nodejs;%PATH%
)

REM Check if application folder exists
if not exist package.json (
    echo Error: Application files not found
    pause
    exit /b 1
)

echo [*] Installing dependencies...
call npm install --production

echo [*] Building application...
call npm run build

echo [*] Starting server...
echo.
echo ========================================
echo   YT DOWNLOADER IS RUNNING
echo ========================================
echo.
echo Open your browser: http://localhost:3000
echo Press Ctrl+C to stop
echo.

start http://localhost:3000
call npm start
