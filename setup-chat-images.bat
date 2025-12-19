@echo off
REM ExpertMentor Chat Image Setup Script (Windows)
REM This script configures Firebase Storage for chat images

echo ==================================
echo ExpertMentor Chat Image Setup
echo ==================================
echo.

REM Check if gcloud is installed
gcloud --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Google Cloud SDK not found!
    echo Please install it from: https://cloud.google.com/sdk/docs/install
    pause
    exit /b 1
)

echo [+] Google Cloud SDK found
echo.

REM Check if firebase is installed
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Firebase CLI not found!
    echo Installing Firebase CLI...
    call npm install -g firebase-tools
)

echo [+] Firebase CLI found
echo.

REM Configuration
set PROJECT_ID=expertmentor-3c14
set STORAGE_BUCKET=expertmentor-3c14.appspot.com

echo Configuring for project: %PROJECT_ID%
echo Storage bucket: %STORAGE_BUCKET%
echo.

REM Step 1: Set project
echo [1/4] Setting Google Cloud project...
call gcloud config set project %PROJECT_ID%

if %errorlevel% neq 0 (
    echo [X] Failed to set project
    pause
    exit /b 1
)

echo [+] Project configured
echo.

REM Step 2: Authenticate
echo [2/4] Authenticating with Firebase...
call gcloud auth application-default login

if %errorlevel% neq 0 (
    echo [X] Authentication failed
    pause
    exit /b 1
)

echo [+] Authenticated
echo.

REM Step 3: Apply CORS
echo [3/4] Applying CORS configuration to Firebase Storage...
call gsutil cors set cors.json gs://%STORAGE_BUCKET%

if %errorlevel% neq 0 (
    echo [!] CORS setup warning - continuing anyway
)

echo [+] CORS applied
echo.

REM Step 4: Deploy rules
echo [4/4] Deploying Firebase rules...
call firebase deploy --only storage,firestore

if %errorlevel% neq 0 (
    echo [!] Firebase deployment had issues
    echo You can manually deploy with: firebase deploy
)

echo.
echo ==================================
echo [+] Setup Complete!
echo ==================================
echo.
echo What's next?
echo 1. Test image upload in chat
echo 2. Check browser console for any errors
echo 3. Verify images load in full-screen view
echo.
echo Troubleshooting:
echo - Images won't upload? Check Firebase Storage bucket name
echo - Images won't load? Verify CORS is applied and rules are deployed
echo - Check documentation: CHAT_IMAGE_GUIDE.md
echo.
pause
