@echo off
REM Build Script for YT Downloader Executable
echo Building YT Downloader Executable...
echo.

REM Set npm path
set NPM_PATH="C:\Program Files\nodejs\npm.cmd"

REM Install dependencies
echo Step 1: Installing dependencies...
call %NPM_PATH% install
if errorlevel 1 (
    echo Failed to install dependencies
    pause
    exit /b 1
)

REM Build the Next.js app
echo.
echo Step 2: Building Next.js application...
call %NPM_PATH% run build
if errorlevel 1 (
    echo Failed to build Next.js app
    pause
    exit /b 1
)

REM Install pkg if not already installed
echo.
echo Step 3: Installing pkg (bundler)...
call %NPM_PATH% install pkg --save-dev
if errorlevel 1 (
    echo Failed to install pkg
    pause
    exit /b 1
)

REM Build the executable
echo.
echo Step 4: Building Windows executable...
call %NPM_PATH% run build-exe
if errorlevel 1 (
    echo Failed to build executable
    pause
    exit /b 1
)

echo.
echo Build completed successfully!
echo Executable: dist\ytdownloader.exe
pause
