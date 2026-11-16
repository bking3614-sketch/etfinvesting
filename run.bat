@echo off
title ETF Quant Backtest Terminal
echo ============================================================
echo   [ETF Seasonality Switching Alpha Dashboard]
echo   Starting local quant dashboard server...
echo ============================================================
echo.

start "" cmd /c "timeout /t 2 /nobreak > nul & start http://127.0.0.1:5000"

python app.py

pause