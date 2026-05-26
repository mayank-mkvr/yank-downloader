@echo off
REM YT Downloader - Complete Setup and Launcher
REM Double-click this file to install and run the YouTube Downloader

setlocal enabledelayedexpansion
title YT Downloader Setup

REM Get script directory
cd /d "%~dp0"

echo.
echo ========================================
echo   YT DOWNLOADER - Setup & Launch
echo ========================================
echo.
echo This script will download and install all required components
echo and then start the YouTube Downloader application.
echo.
echo Checking system requirements...
echo.

REM Add Node.js to PATH if it exists
if exist "C:\Program Files\nodejs" (
    set "PATH=C:\Program Files\nodejs;!PATH!"
)

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js is not installed.
    echo.
    echo Would you like to install Node.js now?
    choice /C YN /M "Install Node.js?"
    if !errorlevel! equ 1 (
        echo Installing Node.js...
        if exist "C:\Windows\System32\winget.exe" (
            call winget install OpenJS.NodeJS --silent
            REM Update PATH after install
            set "PATH=C:\Program Files\nodejs;!PATH!"
        ) else (
            echo.
            echo Winget is not available on your system.
            echo Please install Node.js manually from: https://nodejs.org/
            echo Then restart this script.
            pause
            exit /b 1
        )
    ) else (
        echo.
        echo Node.js is required to run this application.
        echo Please install from https://nodejs.org/
        pause
        exit /b 1
    )
)

echo [✓] Node.js found
echo.

REM Check if we're in the app directory or if it exists
if not exist "package.json" (
    if exist "..\package.json" (
        cd ..
    ) else (
        echo [!] Application files not found in this directory.
        pause
        exit /b 1
    )
)

echo [*] Installing dependencies...
call npm install --production >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Failed to install dependencies
    call npm install
    if %errorlevel% neq 0 (
        pause
        exit /b 1
    )
)
echo [✓] Dependencies installed

echo [*] Checking build...
if not exist ".next" (
    echo [*] Building application (this may take 1-2 minutes)...
    call npm run build >nul 2>&1
    if %errorlevel% neq 0 (
        echo [!] Build failed - running full build
        call npm run build
        if %errorlevel% neq 0 (
            pause
            exit /b 1
        )
    )
)
echo [✓] Application ready

echo.
echo ========================================
echo [*] Starting YT Downloader
echo ========================================
echo.
echo URL: http://localhost:3000
echo.
echo Press Ctrl+C in this window to stop the server.
echo.

REM Start browser
timeout /t 1 /nobreak
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" "http://localhost:3000"
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:3000"
) else (
    start http://localhost:3000
)

REM Start the Node server
call npm start
