@echo off
title qr-abalo - Iniciador
cd /d "%~dp0"

echo ============================================================
echo  Abalo-Caxi - Iniciador completo
echo ============================================================
echo.
echo Este script vai abrir DUAS janelas:
echo   1) Servidor Vite  (npm run dev na porta 5173)
echo   2) Ngrok          (tunel publico HTTPS)
echo.
echo Aguarde uns 10 segundos apos abrir antes de gerar o QR.
echo Para encerrar tudo: feche as duas janelas que abrirem.
echo.
pause

echo.
echo Abrindo o servidor...
start "qr-abalo - Servidor (Vite)" cmd /k "cd /d %~dp0 && npm run dev"

echo Aguardando 8 segundos para o Vite subir...
timeout /t 8 /nobreak >nul

echo.
echo Abrindo o ngrok...
start "qr-abalo - Ngrok" cmd /k "ngrok http --url=roamer-frisk-work.ngrok-free.dev 5173"

echo.
echo ============================================================
echo  Tudo iniciado! Abra no navegador:
echo.
echo      https://roamer-frisk-work.ngrok-free.dev
echo.
echo  (URL fixa - sempre a mesma)
echo ============================================================
echo.
pause
