@echo off
cd /d f:\Broadcast\broadcast-game
echo Starting electron-builder --win...
node_modules\.bin\electron-builder.cmd --win
echo Done.
exit /b %ERRORLEVEL%