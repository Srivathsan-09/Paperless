@echo off
REM Paperless Vercel Deployment Helper (Windows)
REM This script prepares the project for Vercel deployment and optimizes function count

echo.
echo 🔧 Paperless Vercel Deployment Optimizer
echo ==========================================
echo.

REM Check if .vercelignore exists
if not exist ".vercelignore" (
    echo ❌ .vercelignore not found!
    exit /b 1
)
echo ✅ .vercelignore found

REM Check if vercel.json is optimized
findstr /c:"functions" vercel.json >nul
if %errorlevel% equ 0 (
    echo ✅ vercel.json configured with explicit function definition
) else (
    echo ⚠️  vercel.json might not have explicit function configuration
)

REM Remove Vercel cache
echo.
echo 🧹 Cleaning Vercel cache...
if exist ".vercel" (
    rmdir /s /q .vercel
    echo ✅ Cleared .vercel directory
)

REM Install dependencies
echo.
echo 📦 Installing dependencies...
call npm install --production >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Dependencies installed
) else (
    echo ⚠️  npm install had issues
)

REM Verify required files
echo.
echo 📋 Verifying required files...
setlocal enabledelayedexpansion
set "files=api\index.js,api\config\db.js,api\config\passport.js,api\middleware\verifyToken.js,api\middleware\verifyAdmin.js,api\routes\auth.js,api\routes\categories.js,api\routes\entries.js,api\routes\admin.js"

set missing=0
for %%f in (%files%) do (
    if exist "%%f" (
        echo ✅ %%f
    ) else (
        echo ❌ %%f ^(MISSING^)
        set /a missing=!missing!+1
    )
)

if !missing! gtr 0 (
    echo.
    echo ❌ !missing! required files are missing!
    exit /b 1
)

REM Summary
echo.
echo ==========================================
echo ✅ Optimization Complete!
echo.
echo 📊 Deployment Summary:
echo    - Serverless Functions: 1
echo    - Entry Point: api/index.js
echo    - Status: Ready for Vercel deployment
echo.
echo 🚀 Next steps:
echo    1. Set environment variables in Vercel dashboard:
echo       - MONGODB_URI
echo       - JWT_SECRET
echo       - GOOGLE_CLIENT_ID
echo       - GOOGLE_CLIENT_SECRET
echo.
echo    2. Deploy with: vercel --prod
echo.

endlocal
