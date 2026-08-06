@echo off
cd /d "%~dp0"

echo ========================================
echo  broadcast-game - BUILD ^& RUN
echo ========================================
echo.

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found. Please install Node.js.
  pause
  exit /b 1
)

echo [1/2] Building React app...
call npm run build
if errorlevel 1 (
  echo.
  echo [ERROR] Build failed.
  pause
  exit /b 1
)

echo.
echo [2/2] Starting Electron...
call npm start

if errorlevel 1 (
  echo.
  echo [ERROR] Failed to start.
  pause
  exit /b 1
)

pause
