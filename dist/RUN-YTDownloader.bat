@echo off
REM YT Downloader - Launcher
REM This batch file launches the YouTube Downloader application

setlocal enabledelayedexpansion

REM Get the directory where this batch file is located
cd /d "%~dp0"

echo ========================================
echo   YT Downloader
echo ========================================
echo.
echo Checking for Node.js...

REM Check if Node.js is available in PATH
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo Node.js is required but not installed.
    echo.
    echo Would you like to install Node.js now?
    echo (This requires internet connection and administrator privileges)
    echo.
    choice /C YN /M "Install Node.js?"
    
    if !errorlevel! equ 1 (
        REM User chose Yes
        if exist "C:\Program Files\nodejs\node.exe" (
            REM Node already installed, just add to PATH temporarily
            set "PATH=C:\Program Files\nodejs;!PATH!"
        ) else (
            REM Try to install with winget
            winget install OpenJS.NodeJS --silent
            if !errorlevel! equ 0 (
                echo Node.js installed successfully!
                set "PATH=C:\Program Files\nodejs;!PATH!"
            ) else (
                echo.
                echo Failed to install Node.js automatically.
                echo Please install manually from: https://nodejs.org/
                pause
                exit /b 1
            )
        )
    ) else (
        echo.
        echo Cannot proceed without Node.js.
        echo Please visit https://nodejs.org/ to install.
        pause
        exit /b 1
    )
)

echo ✓ Node.js found
echo.
echo Checking dependencies...

REM Install dependencies
call npm install --production
if !errorlevel! neq 0 (
    echo Failed to install dependencies
    pause
    exit /b 1
)

echo ✓ Dependencies installed
echo.
echo ========================================
echo Starting YT Downloader...
echo ========================================
echo.
echo The application will open in your default browser.
echo If it doesn't open automatically, visit: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server.
echo.

REM Start the app
timeout /t 2 /nobreak
start http://localhost:3000
call npm start

if !errorlevel! neq 0 (
    echo Application error occurred
    pause
    exit /b 1
)
