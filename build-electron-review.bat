@echo off
setlocal
cd /d "%~dp0"

echo ===================================================
echo  [Review Build] 심사용 올오픈 빌드 시작
echo  - 전 캐릭터 보유 / S등급 / 최대 스탯
echo  - 자금 $5,000,000 / H씬·업적 전부 해금
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
echo  [Review Build] 완료
echo  출력: dist-electron-review
echo ===================================================
if exist "dist-electron-review" (
  explorer "dist-electron-review"
) else (
  explorer "C:\Users\shogu\AppData\Local\Temp\broadcast-game-dist-review"
)
pause
endlocal
