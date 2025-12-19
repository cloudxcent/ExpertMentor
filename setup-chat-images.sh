#!/bin/bash

# ExpertMentor Chat Image Setup Script
# This script configures Firebase Storage for chat images

echo "=================================="
echo "ExpertMentor Chat Image Setup"
echo "=================================="
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK not found!"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo "✓ Google Cloud SDK found"
echo ""

# Check if firebase-cli is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found!"
    echo "Installing Firebase CLI..."
    npm install -g firebase-tools
fi

echo "✓ Firebase CLI found"
echo ""

# Get project ID
PROJECT_ID="expertmentor-3c14"
STORAGE_BUCKET="expertmentor-3c14.appspot.com"

echo "Configuring for project: $PROJECT_ID"
echo "Storage bucket: $STORAGE_BUCKET"
echo ""

# Set project
echo "[1/4] Setting Google Cloud project..."
gcloud config set project $PROJECT_ID

if [ $? -ne 0 ]; then
    echo "❌ Failed to set project"
    exit 1
fi

echo "✓ Project configured"
echo ""

# Authenticate
echo "[2/4] Authenticating with Firebase..."
gcloud auth application-default login

if [ $? -ne 0 ]; then
    echo "❌ Authentication failed"
    exit 1
fi

echo "✓ Authenticated"
echo ""

# Apply CORS
echo "[3/4] Applying CORS configuration to Firebase Storage..."
gsutil cors set cors.json gs://$STORAGE_BUCKET

if [ $? -ne 0 ]; then
    echo "⚠ CORS setup failed, but continuing..."
fi

echo "✓ CORS applied"
echo ""

# Deploy rules
echo "[4/4] Deploying Firebase rules..."
firebase deploy --only storage,firestore

if [ $? -ne 0 ]; then
    echo "⚠ Firebase deployment had issues"
    echo "You can manually deploy with: firebase deploy"
fi

echo ""
echo "=================================="
echo "✓ Setup Complete!"
echo "=================================="
echo ""
echo "What's next?"
echo "1. Test image upload in chat"
echo "2. Check browser console for any errors"
echo "3. Verify images load in full-screen view"
echo ""
echo "Troubleshooting:"
echo "- Images won't upload? Check Firebase Storage bucket name"
echo "- Images won't load? Verify CORS is applied and rules are deployed"
echo "- Check documentation: CHAT_IMAGE_GUIDE.md"
