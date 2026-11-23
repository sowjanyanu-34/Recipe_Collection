@echo off
setlocal
cd /d "%~dp0"
title Recipe Collection and Management System

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not on your PATH.
  echo         Install the LTS version from https://nodejs.org and run this file again.
  pause
  exit /b 1
)

if not exist ".env" (
  echo .env not found - creating it from .env.example with a random session secret...
  copy /y ".env.example" ".env" >nul
  powershell -NoProfile -Command "$s=[guid]::NewGuid().ToString('N')+[guid]::NewGuid().ToString('N'); (Get-Content .env) -replace 'replace_with_a_long_random_secret',$s | Set-Content .env"
  echo Created .env. Edit MONGODB_URI in it if you use MongoDB Atlas.
)

if not exist "node_modules" (
  echo Installing dependencies, this can take a minute...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

echo.
echo Starting the app. Open http://localhost:5000 in your browser. Press Ctrl+C to stop.
echo.
call npm start
if errorlevel 1 (
  echo.
  echo [ERROR] The server stopped with an error. Read the message above.
  echo         Most common cause: MongoDB is not running or MONGODB_URI in .env is wrong.
)
pause
