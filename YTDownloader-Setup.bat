@echo off
REM YT Downloader - Standalone Installer & Launcher
REM This script will download Node.js (if needed), install dependencies, and launch the app

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ========================================
echo   YT Downloader - Local Installation
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed. Installing...
    REM Use winget to install Node.js
    winget install OpenJS.NodeJS --silent
    if !errorlevel! neq 0 (
        echo Warning: Failed to auto-install Node.js
        echo Please visit https://nodejs.org/ and install Node.js manually
        echo Then run this script again.
        pause
        exit /b 1
    )
    REM Refresh PATH
    for /f "tokens=2*" %%A in ('reg query HKCU\Environment /v PATH') do set "PATH=%%B"
    for /f "tokens=2*" %%A in ('reg query HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment /v PATH') do set "PATH=!PATH!;%%B"
) else (
    echo ✓ Node.js is already installed
)

echo.
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Building application...
call npm run build
if %errorlevel% neq 0 (
    echo Failed to build application
    pause
    exit /b 1
)

echo.
echo ========================================
echo Starting YT Downloader...
echo Opening http://localhost:3000 in your browser...
echo ========================================
echo.

REM Start the app
start http://localhost:3000
call npm start

if %errorlevel% neq 0 (
    echo Failed to start application
    pause
    exit /b 1
)
