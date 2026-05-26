@echo off
setlocal enabledelayedexpansion

cd /d h:\ytdownloader

echo Building YT Downloader .exe file...
echo.

REM Use local npx from node_modules
if exist node_modules\.bin\pkg.cmd (
    echo Building with local pkg...
    call node_modules\.bin\pkg.cmd . --targets win-x64 --output dist/ytdownloader.exe --compress Brotli
) else (
    echo Installing pkg locally...
    call "C:\Program Files\nodejs\npm.cmd" install pkg
    if !errorlevel! equ 0 (
        call npx pkg . --targets win-x64 --output dist/ytdownloader.exe --compress Brotli
    )
)

if exist dist\ytdownloader.exe (
    echo.
    echo ======================================
    echo .EXE FILE CREATED SUCCESSFULLY!
    echo ======================================
    echo File: dist\ytdownloader.exe
    for %%A in (dist\ytdownloader.exe) do (
        set size=%%~zA
        for /f %%B in ("!size!") do (
            set /A sizeMB=%%B/1048576
            echo Size: !sizeMB! MB
        )
    )
    echo.
    echo Ready for download!
) else (
    echo.
    echo Failed to create .exe file
    pause
    exit /b 1
)
