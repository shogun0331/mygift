@echo off
cd /d f:\Broadcast\broadcast-game
echo [1/2] Running electron-builder...
call node_modules\.bin\electron-builder.cmd --win
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%
echo BUILD SUCCESS