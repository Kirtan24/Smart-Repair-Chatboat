@echo off
echo ========================================
echo   Smart Repair Assistant - Dev Startup
echo ========================================

echo.
echo [1/2] Starting Backend (port 5000)...
start "Backend - Smart Repair API" cmd /k "cd /d %~dp0backend && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend (port 3000)...
start "Frontend - Smart Repair UI" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo  Both servers starting...
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo ========================================
timeout /t 5 /nobreak >nul
start "" "http://localhost:3000"
