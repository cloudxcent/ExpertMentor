#!/bin/bash

# ExpertMentor Mobile Chat Images Setup (Mac/Linux)
# For React Native/Expo Mobile Apps
# CORS is NOT needed for mobile - only Firestore and Storage rules

echo "=================================="
echo "ExpertMentor Mobile Chat Setup"
echo "=================================="
echo ""
echo "This setup configures Firebase for mobile image support"
echo "CORS configuration is NOT needed for mobile apps"
echo ""

# Check if firebase is installed
if ! command -v firebase &> /dev/null; then
    echo "[!] Firebase CLI not found!"
    echo "Installing Firebase CLI..."
    npm install -g firebase-tools
fi

echo "[+] Firebase CLI found"
echo ""

# Configuration
PROJECT_ID="expertmentor-3c14"

echo "Configuring for project: $PROJECT_ID"
echo ""

# Step 1: Authenticate
echo "[1/2] Authenticating with Firebase..."
firebase login --reauth

if [ $? -ne 0 ]; then
    echo "[X] Authentication failed"
    exit 1
fi

echo "[+] Authenticated"
echo ""

# Step 2: Deploy rules
echo "[2/2] Deploying Firebase Security Rules..."
echo "         - Firestore rules"
echo "         - Storage rules"
echo ""

firebase deploy --only storage,firestore

if [ $? -ne 0 ]; then
    echo "[!] Deployment had issues"
    echo "You can manually deploy with: firebase deploy"
    exit 1
fi

echo ""
echo "=================================="
echo "[+] Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Run: npm run dev"
echo "2. Open the mobile app in Expo"
echo "3. Test image upload in chat"
echo "4. Check console for [Chat] messages"
echo ""
echo "Troubleshooting:"
echo "- Images won't upload? Check Firebase Storage rules"
echo "- Permission denied? Verify firestore.rules allows uploads"
echo "- Check browser/Expo console for [Chat] prefixed logs"
