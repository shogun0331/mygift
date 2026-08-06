@echo off
cd /d "%~dp0"

echo ========================================
echo  broadcast-game - DEV MODE
echo ========================================
echo.

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found. Please install Node.js.
  pause
  exit /b 1
)

echo Starting Vite + Electron...
echo Press Ctrl+C in this window to stop.
echo.

call npm run dev

if errorlevel 1 (
  echo.
  echo [ERROR] Failed to start.
  pause
  exit /b 1
)

pause
