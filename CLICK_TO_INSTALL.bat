@echo off
title Kooroppada Library Setup
echo Starting Installer...
powershell -ExecutionPolicy Bypass -File "%~dp0INSTALL_NOW.ps1"
if %errorlevel% neq 0 (
    echo.
    echo ❌ Installation failed. Please try Right-Click > Run as Administrator on this file.
    pause
)
