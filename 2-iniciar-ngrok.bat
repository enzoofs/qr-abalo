@echo off
title qr-abalo - Ngrok (dominio fixo)
cd /d "%~dp0"

echo ============================================================
echo  Abalo-Caxi - Ngrok (dominio fixo)
echo ============================================================
echo.
echo URL FIXA: https://roamer-frisk-work.ngrok-free.dev
echo.
echo IMPORTANTE: rode primeiro o "1-iniciar-servidor.bat" e espere
echo aparecer "Local: http://localhost:5173/" antes de abrir este.
echo.
echo Essa URL nao muda mais! Ja esta cadastrada no Supabase e
echo no Google Cloud, entao login com Google funciona direto.
echo.
echo NAO FECHE ESTA JANELA durante a apresentacao.
echo Para encerrar: pressione Ctrl+C ou feche a janela.
echo.
echo ============================================================
echo.

ngrok http --url=roamer-frisk-work.ngrok-free.dev 5173

echo.
echo O ngrok encerrou. Pressione qualquer tecla para fechar.
pause >nul
