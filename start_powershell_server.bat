@echo off
echo Starting Health Data Visualization Server (PowerShell)...
echo.
echo This will start a local server to view your health data map.
echo The server will open in your default browser automatically.
echo.
echo Press Ctrl+C to stop the server when you're done.
echo.

powershell -ExecutionPolicy Bypass -File start_server.ps1

pause
