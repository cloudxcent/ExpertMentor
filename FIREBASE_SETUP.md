# Firebase Setup Instructions

## Prerequisites

You need a Firebase project to enable authentication. Follow these steps:

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" or "Create a Project"
3. Enter your project name (e.g., "ExpertMentor")
4. Follow the setup wizard

## 2. Enable Authentication Methods

### Email/Password Authentication

1. In your Firebase project, go to **Authentication** in the left sidebar
2. Click on the **Sign-in method** tab
3. Click on **Email/Password**
4. Enable **Email/Password** (first toggle)
5. Click **Save**

### Google Sign-In (Gmail)

1. In the same **Sign-in method** tab
2. Click on **Google**
3. Enable the toggle
4. Enter your project support email
5. Click **Save**

### Phone Authentication (OTP)

1. In the same **Sign-in method** tab
2. Click on **Phone**
3. Enable the toggle
4. Click **Save**
5. Add your test phone numbers in the "Phone numbers for testing" section (optional)

## 3. Get Your Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click the **Web** icon (`</>`) to add a web app
4. Register your app with a nickname (e.g., "ExpertMentor Web")
5. You'll see a config object with these values:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123:web:abc..."
   };
   ```

## 4. Enable Firestore Database

1. In Firebase Console, go to **Firestore Database** in the left sidebar
2. Click **Create database**
3. Select **Start in production mode** (we'll set up rules later)
4. Choose your Cloud Firestore location (select one close to your users)
5. Click **Enable**

### Firestore Security Rules

After creating the database, update the security rules:

1. Go to **Firestore Database** > **Rules** tab
2. Replace the default rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /profiles/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    match /sessions/{sessionId} {
      allow read: if request.auth != null &&
        (request.auth.uid == resource.data.expertId ||
         request.auth.uid == resource.data.clientId);
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        (request.auth.uid == resource.data.expertId ||
         request.auth.uid == resource.data.clientId);
    }

    match /messages/{messageId} {
      allow read: if request.auth != null &&
        (request.auth.uid == resource.data.senderId ||
         request.auth.uid == resource.data.receiverId);
      allow create: if request.auth != null;
    }

    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

## 5. Update Your `.env` File

Copy the values from Firebase config and paste them into your `.env` file:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123:web:abc...
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 6. Restart Your Development Server

After updating the `.env` file, restart your development server to load the new environment variables.

## Authentication Flow

The app now supports three authentication methods:

### 1. Email/Password Authentication
- Users can sign up with email and password
- Existing users can sign in with their credentials
- Minimum password length: 6 characters

### 2. Google Sign-In (Web Only)
- One-click sign-in with Google account
- Automatically creates user profile on first sign-in
- Available only on web platform

### 3. Phone OTP Authentication (Web Only)
- Users enter phone number with country code
- Receive 6-digit OTP via SMS
- Verify OTP to complete authentication
- Available only on web platform

### Post-Authentication Flow

1. **New Users**: After first sign-in, users are directed to:
   - User Type Selection: Choose "I Need Advice" (client) or "I'm an Expert"
   - Profile Setup: Complete profile with relevant information

2. **Returning Users**: Automatically redirected to the main app

### Data Storage

- **Authentication**: Firebase handles user authentication
- **User Data**: All profile data, sessions, messages, and reviews are stored in Firebase Firestore
- **User ID**: Firebase UID is used as the primary key in Firestore

## User Types

### Client ("I Need Advice")
- Basic profile with name and bio
- Can search and connect with experts
- Pay for consultations

### Expert ("I'm an Expert")
- Detailed profile with:
  - Years of experience
  - Areas of expertise
  - Chat rate (per minute)
  - Call rate (per minute)
- Can provide consultations
- Earn from sessions

## Troubleshooting

### Common Issues

1. **"Firebase: Error (auth/invalid-api-key)"**
   - Check that your API key is correct in `.env`
   - Ensure there are no extra spaces

2. **"Firebase: Error (auth/network-request-failed)"**
   - Check your internet connection
   - Verify Firebase project is active

3. **Environment variables not loading**
   - Restart the dev server after changing `.env`
   - Clear Metro cache: `npx expo start --clear`

## Security Notes

- Never commit your Firebase credentials to version control
- The `.env` file is already in `.gitignore`
- Use Firebase Security Rules to protect your data
- Enable email verification in production (optional)
