@echo off
setlocal
cd /d "%~dp0"

echo ===================================================
echo  [Uncensored Build] Mosaic overlays OFF
echo  SNS / VN / promotion audit show original media
echo  Output does not overwrite the DLsite mosaic build
echo ===================================================
echo.

call npm run build:electron:uncensored
if %ERRORLEVEL% neq 0 (
    echo.
    echo [Uncensored Build] ERROR: Build failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo  [Uncensored Build] Build completed successfully!
echo  [Uncensored Build] Output: dist-electron-uncensored
echo ===================================================
if exist "dist-electron-uncensored" (
    explorer "dist-electron-uncensored"
) else (
    explorer "C:\Users\shogu\AppData\Local\Temp\broadcast-game-dist-uncensored"
)
pause
endlocal
