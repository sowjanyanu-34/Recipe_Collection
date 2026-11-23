@echo off
setlocal
cd /d "%~dp0"
title Seed sample recipes

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed. Install it from https://nodejs.org and try again.
  pause
  exit /b 1
)
if not exist ".env" (
  echo [ERROR] .env not found. Run start.bat once first, or copy .env.example to .env.
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)
call npm run seed
pause
