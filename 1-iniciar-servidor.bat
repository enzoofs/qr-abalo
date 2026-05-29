@echo off
title qr-abalo - Servidor (Vite)
cd /d "%~dp0"

echo ============================================================
echo  Abalo-Caxi - Servidor de desenvolvimento (Vite)
echo ============================================================
echo.
echo Iniciando o servidor. Quando aparecer "Local: http://localhost:5173"
echo o servidor esta pronto.
echo.
echo NAO FECHE ESTA JANELA durante a apresentacao.
echo Para encerrar: pressione Ctrl+C ou feche a janela.
echo.
echo ============================================================
echo.

call npm run dev

echo.
echo O servidor encerrou. Pressione qualquer tecla para fechar.
pause >nul
