@echo off
title E-Commerce Price Tracker ^& Alert System Launcher
color 0B

echo ====================================================================
echo              E-Commerce Price Tracker ^& Alert System
echo ====================================================================
echo.

:: Check Python installation
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not added to your system PATH.
    echo Please install Python 3.8+ and try again.
    pause
    exit /b 1
)

:: Setup virtual environment if it doesn't exist
if not exist "venv" (
    echo [SYSTEM] Creating virtual environment (venv)...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo [SYSTEM] Virtual environment created successfully.
    echo.
)

:: Install dependencies if not already done
echo [SYSTEM] Checking dependencies...
venv\Scripts\python.exe -m pip show fastapi >nul 2>&1
if %errorlevel% neq 0 (
    echo [SYSTEM] Installing project requirements from backend/requirements.txt...
    venv\Scripts\pip install -r backend\requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
    echo [SYSTEM] Dependencies installed successfully.
    echo.
) else (
    echo [SYSTEM] Dependencies are already satisfied.
    echo.
)

echo [SYSTEM] Initializing system services...
echo.
echo --------------------------------------------------------------------
echo [INFO] E-Commerce Tracker running on: http://127.0.0.1:8000
echo [INFO] Press Ctrl+C to terminate the application.
echo --------------------------------------------------------------------
echo.

:: Start FastAPI server
venv\Scripts\python.exe -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload

pause
