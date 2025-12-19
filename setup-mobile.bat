@echo off
REM ExpertMentor Mobile Chat Images Setup (Windows)
REM For React Native/Expo Mobile Apps
REM CORS is NOT needed for mobile - only Firestore and Storage rules

echo ==================================
echo ExpertMentor Mobile Chat Setup
echo ==================================
echo.
echo This setup configures Firebase for mobile image support
echo CORS configuration is NOT needed for mobile apps
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

echo Configuring for project: %PROJECT_ID%
echo.

REM Step 1: Authenticate
echo [1/2] Authenticating with Firebase...
call firebase login --reauth

if %errorlevel% neq 0 (
    echo [X] Authentication failed
    pause
    exit /b 1
)

echo [+] Authenticated
echo.

REM Step 2: Deploy rules
echo [2/2] Deploying Firebase Security Rules...
echo         - Firestore rules
echo         - Storage rules
echo.

call firebase deploy --only storage,firestore

if %errorlevel% neq 0 (
    echo [!] Deployment had issues
    echo You can manually deploy with: firebase deploy
    pause
    exit /b 1
)

echo.
echo ==================================
echo [+] Setup Complete!
echo ==================================
echo.
echo Next steps:
echo 1. Run: npm run dev
echo 2. Open the mobile app in Expo
echo 3. Test image upload in chat
echo 4. Check console for [Chat] messages
echo.
echo Troubleshooting:
echo - Images won't upload? Check Firebase Storage rules
echo - Permission denied? Verify firestore.rules allows uploads
echo - Check browser/Expo console for [Chat] prefixed logs
echo.
pause
