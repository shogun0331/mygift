@echo off
echo ===================================================
echo  [Electron Build] Starting electron build...
echo ===================================================

call npm run build:electron

if %ERRORLEVEL% neq 0 (
    echo.
    echo [Electron Build] ERROR: Build failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo  [Electron Build] Build completed successfully!
echo  [Electron Build] Opening build folder...
echo ===================================================
explorer "dist-electron"
pause
