@echo off
REM Developer / Creator: Sadri ERCAN
TITLE ModelDock - Orchestrator
echo [1/3] Port 4000 ve 3000 temizleniyor (Hizli mod)...
powershell -Command "Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }" >nul 2>&1
powershell -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }" >nul 2>&1

echo [2/3] Backend baslatiliyor...
start "ModelDock-Backend" cmd /k "node server.js"

echo [3/3] Frontend baslatiliyor...
start "ModelDock-Frontend" cmd /k "npm run dev"

echo.
echo ==========================================
echo Uygulama Baslatildi!
echo Backend: http://localhost:4000
echo Frontend: http://localhost:3000
echo ==========================================
echo.
pause
