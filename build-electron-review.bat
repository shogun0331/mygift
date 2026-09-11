@echo off
setlocal
cd /d "%~dp0"

echo ===================================================
echo  [Review Build] Starting review (all-clear) build...
echo  - All characters owned, S-rank, max stats
echo  - Assets 5000000 USD, H scenes and achievements unlocked
echo ===================================================
echo.

call npm run build:electron:review
if %ERRORLEVEL% neq 0 (
    echo.
    echo [Review Build] ERROR: Build failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo  [Review Build] Build completed successfully!
echo  [Review Build] Output: dist-electron-review
echo ===================================================
if exist "dist-electron-review" (
    explorer "dist-electron-review"
) else (
    explorer "C:\Users\shogu\AppData\Local\Temp\broadcast-game-dist-review"
)
pause
endlocal