# ExpertMentor App - Complete Architecture & Tech Stack Guide

## 📋 Overview
**ExpertMentor** (Mentorxity) is a cross-platform mentorship and consulting mobile application built with React Native/Expo. It connects experts with clients for real-time consultations via chat and video/audio calls.

---

## 🛠️ Tech Stack

### Frontend Framework
- **Expo 54.0.0** - Cross-platform development (iOS, Android, Web)
- **React 19.0.0** - UI library
- **React Native 0.79.1** - Native mobile framework
- **React Router/Expo Router 5.0.2** - File-based routing system
- **TypeScript 5.8.3** - Type safety

### UI & Styling
- **Expo Linear Gradient** - Gradient backgrounds
- **Lucide React Native** - Icon library
- **React Native Modal** - Modal dialogs
- **React Native Reanimated 3.17.4** - Advanced animations
- **React Native SVG** - SVG rendering
- **React Native Safe Area Context** - Safe area handling

### State Management & Storage
- **Async Storage** - Local data persistence
- **React Context API** - Global state management

### Networking & API
- **Axios 1.13.2** - HTTP client for backend communication
- **Firebase SDK 10.13.0** - Real-time database & auth
- **React Native URL Polyfill 2.0.0** - URL compatibility

### Authentication
- **Firebase Authentication** - Primary auth provider
  - Email/Password authentication
  - Phone number authentication (OTP)
  - Google Sign-In integration
- **Google Sign-In SDK** - OAuth integration
- **Expo Auth Session** - OAuth flow handling
- **Expo Web Browser** - Browser-based OAuth flows

### Databases
1. **Firebase Firestore** - Primary NoSQL database
   - Real-time user profiles
   - Call sessions and history
   - Transaction records
   - Real-time listeners for presence

2. **Supabase** - PostgreSQL database
   - Notifications management
   - Chat messages and sessions
   - User profiles backup
   - Email validation

### Real-time Communication
- **Agora SDK** (via real implementation) - Audio/video calling
- **Firebase Real-time Listeners** - Call signaling and state updates
- **WebSocket support** - Real-time chat and notifications

### Payment Integration
- **Razorpay** - Primary payment gateway
  - Order creation
  - Payment verification
  - Refund processing
- **Cashfree** - Secondary payment gateway
  - Mobile wallet integration
  - UPI payments
  - Alternative payment methods

### Media & Device Access
- **Expo Camera** - Camera access (QR scanning, video calls)
- **Expo AV** - Audio/Video playback and recording
- **Expo Image Picker** - Profile image selection
- **Expo Barcode Scanner** - QR code scanning
- **Expo Haptics** - Haptic feedback

### Development Tools
- **Babel 7.25.2** - JavaScript transpiler
- **ESLint 9.0.0** - Code linting
- **Metro Bundler** - React Native bundler
- **Expo CLI** - Development server

---

## 🏗️ Project Structure

### Root Configuration Files
```
app.json              - Expo configuration (plugins, permissions, build settings)
babel.config.js       - Babel transpilation config
eslint.config.js      - ESLint rules
metro.config.js       - Metro bundler config
tsconfig.json         - TypeScript configuration
package.json          - Dependencies and scripts
firebase.json         - Firebase config
firestore.rules       - Firestore security rules
```

### Directory Structure

#### `/app` - Application Screens (File-based Routing)
- **`_layout.tsx`** - Root layout/navigation setup
- **`+not-found.tsx`** - 404 error page

**Auth Routes** (`/app/(auth)`)
- `login.tsx` - Email, phone, and Google sign-in
- `profile-setup.tsx` - User profile creation (expert/client)
- `user-type-selection.tsx` - User role selection
- `forgot-password.tsx` - Password recovery

**Tab Navigation** (`/app/(tabs)`)
- `index.tsx` - Home/Dashboard
- `chat.tsx` - Chat list
- `search.tsx` - Expert search
- `profile.tsx` - User profile management

**Dynamic Routes**
- `call/[expertId].tsx` - In-call screen
- `chat/[expertId].tsx` - Chat conversation screen
- `expert-detail/[expertId].tsx` - Expert profile view
- `session-review/[sessionId].tsx` - Session review/rating

**Other Screens**
- `analytics.tsx` - Analytics dashboard
- `expert-pricing.tsx` - Expert rate management
- `help-support.tsx` - Customer support
- `incoming-call.tsx` - Incoming call handler
- `live-chat.tsx` - Live support chat
- `my-sessions.tsx` - Session history
- `notifications.tsx` - Notification center
- `offers.tsx` - Special offers/promotions
- `payment-methods.tsx` - Payment method management
- `privacy-policy.tsx`, `terms-conditions.tsx`, `user-guide.tsx` - Legal/help docs
- `reviews.tsx` - User reviews management
- `settings.tsx` - App settings
- `wallet.tsx`, `wallet-topup.tsx` - Wallet management

#### `/components` - Reusable Components
- **`AuthWrapper.tsx`** - Higher-order component for auth protected routes
- **`ExpertCard.tsx`** - Expert profile card component
- **`IncomingCallHandler.tsx`** - Incoming call notification UI
- **`NavigationHandler.tsx`** - Navigation state management
- **`BalanceCheckModal.tsx`** - Wallet balance verification modal
- **`ReviewModal.tsx`** - Session review/rating modal
- **`RecaptchaContainer.tsx`** - reCAPTCHA verification (mobile)
- **`RecaptchaContainer.web.tsx`** - reCAPTCHA verification (web)

#### `/config` - Configuration Files
- **`firebase.ts`** - Firebase initialization
  - Firestore database setup
  - Authentication instance
- **`supabase.ts`** - Supabase client initialization
  - PostgreSQL connection
  - Session persistence
  - Storage configuration

#### `/types` - TypeScript Type Definitions
- **`user.ts`** - User interfaces
  - `User` - Base user type
  - `MentorProfile` - Expert user with rates and ratings
  - `ClientProfile` - Client user with wallet
  - `Session` - Call/Chat session
  - `Transaction` - Payment transaction

#### `/utils` - Utility Functions & Services

**Authentication & Storage**
- **`googleAuth.ts`** - Google OAuth integration
- **`storage.ts`** - Local storage abstraction layer
- **`logout.ts`** - Session cleanup on logout

**API & Database**
- **`api.ts`** - Main Firestore API methods
  - Profile CRUD operations
  - Expert search/filtering
  - Session management
  - Wallet operations
- **`api.firebase.ts`** - Additional Firebase utilities
- **`cachedDataService.ts`** - Caching layer for API responses

**Payment Systems**
- **`paymentHandler.ts`** - Payment orchestration
  - Razorpay integration
  - Cashfree integration
  - Transaction logging
- **`razorpayService.ts`** - Razorpay API wrapper
  - Order creation
  - Payment verification
  - Signature validation
- **`cashfreeService.ts`** - Cashfree API wrapper
  - Payment initiation
  - Webhook handling
- **`callPaymentHandler.ts`** - In-call payment processing

**Real-time Communication**
- **`callSignaling.ts`** - Call session management (Firestore)
  - Create/update call sessions
  - Call status tracking
  - Call history
- **`callListenerService.ts`** - Real-time call listeners
- **`realAgoraImplementation.ts`** - Agora SDK integration
  - Audio/video channel setup
  - Token generation
- **`voipService.ts`** - VoIP call handling

**Notifications & Features**
- **`notifications.ts`** - Push notification handling
  - In-app notifications
  - Background notifications
- **`pricing.ts`** - Rate calculations
- **`firebaseStorageUrl.ts`** - Firebase storage URL generation
- **`suppressErrors.ts`** - Error suppression utilities
- **`useWallet.ts`** - Wallet balance hook

**Data & Mocking**
- **`mockData.ts`** - Mock data for development/testing

#### `/supabase/migrations` - Database Migrations
- **`20251128055114_create_notifications_table.sql`** - Notifications schema
- **`20251202101946_add_duplicate_email_check.sql`** - Email uniqueness validation
- **`20251202105852_create_chat_tables.sql`** - Chat sessions & messages
- **`20251202131954_20251202150000_enhance_chat_features.sql`** - Chat enhancements
- **`20251202132036_20251202150100_create_user_offers_table.sql`** - Offers/promotions

#### `/assets` - Static Resources
- **`/images`** - Icons, logos, and images

#### `/public` - Web Public Assets
- Static files served on web platform

#### `/constants` - Application Constants
- **`Colors.ts`** - Color theme definitions

---

## 🔐 Authentication System

### Authentication Methods
1. **Email/Password**
   - Registration with email validation
   - Login with email and password
   - Firebase Authentication handles persistence

2. **Phone Number (OTP)**
   - Phone number verification
   - Firebase Phone Auth Provider
   - reCAPTCHA verification for security
   - OTP verification flow

3. **Google OAuth**
   - Google Sign-In SDK integration
   - Expo Auth Session for OAuth flow
   - Automatic account creation if first login

### Firebase Auth Flow
```
User Input → Firebase Auth → Success → Create/Update Profile
                           → Error → Show error message
```

### Session Management
- Tokens stored in Async Storage
- Automatic token refresh
- Session validation on app launch
- AuthWrapper component guards protected routes

---

## 📱 Database Schema

### Firebase Firestore Collections

#### 1. **profiles**
```typescript
{
  id: string (userId)
  name: string
  email: string
  mobileNumber: string
  bio: string
  userType: 'expert' | 'client'
  experience?: number (for experts)
  expertise?: string[]
  industry?: string
  chatRate?: number (per minute)
  callRate?: number (per minute)
  videoCallRate?: number (per minute)
  avatarUrl?: string
  isOnline: boolean
  averageRating: number (for experts)
  totalSessions: number
  walletBalance: number
  totalEarnings: number (for experts)
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### 2. **call_sessions**
```typescript
{
  id: string
  callerId: string
  callerName: string
  callerImage?: string
  calleeId: string
  calleeName: string
  calleeImage?: string
  callType: 'audio' | 'video'
  status: 'calling' | 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended' | 'cancelled'
  channelName: string
  startTime?: Timestamp
  endTime?: Timestamp
  duration?: number
  callRate?: number
  totalCost?: number
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### 3. **transactions** (Payment Records)
```typescript
{
  id: string
  userId: string
  amount: number
  currency: string
  provider: 'razorpay' | 'cashfree'
  providerTransactionId: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  description: string
  metadata?: Record<string, any>
  createdAt: Timestamp
  updatedAt: Timestamp
  completedAt?: Timestamp
}
```

#### 4. **session_reviews**
```typescript
{
  id: string
  sessionId: string
  reviewerId: string
  rating: number (1-5)
  review: string
  createdAt: Timestamp
}
```

### Supabase PostgreSQL Tables

#### 1. **profiles** (Backup/Reference)
```sql
- id: text (primary key)
- email: text (unique)
- name: text
- user_type: 'expert' | 'client'
- created_at: timestamptz
```

#### 2. **notifications**
```sql
- id: uuid (primary key)
- user_id: text (foreign key to profiles)
- type: text (session_request, message, review, payment, etc.)
- title: text
- message: text
- data: jsonb (additional metadata)
- is_read: boolean
- created_at: timestamptz
```

#### 3. **chat_sessions**
```sql
- id: text (primary key)
- client_id: text (foreign key)
- expert_id: text (foreign key)
- status: 'active' | 'ended'
- started_at: timestamptz
- ended_at: timestamptz
- last_message_at: timestamptz
- total_messages: integer
- created_at: timestamptz
- updated_at: timestamptz
```

#### 4. **chat_messages**
```sql
- id: text (primary key)
- session_id: text (foreign key)
- sender_id: text (foreign key)
- receiver_id: text (foreign key)
- message: text
- is_read: boolean
- created_at: timestamptz
- updated_at: timestamptz
```

#### 5. **user_offers**
```sql
- id: uuid (primary key)
- user_id: text (foreign key)
- title: text
- description: text
- discount_percent: number
- created_at: timestamptz
```

---

## 💳 Payment System Architecture

### Payment Providers

#### 1. **Razorpay** (Primary)
**Features:**
- Credit/Debit card payments
- UPI integration
- Wallet payments
- EMI options

**Flow:**
1. Client initiates wallet top-up
2. Backend creates Razorpay order
3. Frontend shows Razorpay payment form
4. Client completes payment
5. Webhook confirms transaction
6. Wallet balance updated in Firestore

**Key Files:**
- `razorpayService.ts` - API wrapper
- `paymentHandler.ts` - Orchestration

#### 2. **Cashfree** (Secondary)
**Features:**
- Mobile wallet integration
- UPI direct integration
- NetBanking
- Card payments

**Flow:**
- Similar to Razorpay
- Alternative gateway for redundancy

### Payment Transaction Flow
```
User Initiates → Check Wallet Balance → Open Payment Gateway
                                      → Process Payment
                                      → Backend Verification
                                      → Update Firestore
                                      → Send Notification
```

### Transaction Status
- `pending` - Payment initiated, awaiting confirmation
- `completed` - Payment successful, wallet updated
- `failed` - Payment declined
- `refunded` - Refund processed

---

## 📞 Real-time Communication

### Call System (Agora)
**Architecture:**
1. **Signaling Layer** (Firestore)
   - Call invitation/ringing
   - Accept/reject decisions
   - Call termination
   
2. **Media Layer** (Agora SDK)
   - Audio/Video transmission
   - Channel management
   - Quality adaptation

**Call Lifecycle:**
```
User A → Create Call Session → User B gets notified
      ↓
Call Signaling updates (status: 'calling')
      ↓
User B accepts → Update status to 'ringing'
      ↓
Both join Agora channel → status: 'accepted'
      ↓
Real-time audio/video streaming
      ↓
Either user ends → status: 'ended'
      ↓
Calculate duration & cost → Create transaction
```

### Chat System (Supabase + Firebase)
**Real-time Features:**
- Instant message delivery (Supabase)
- Real-time listeners (Firebase)
- Message read receipts
- Typing indicators

---

## 🔔 Notifications System

### Notification Types
1. **Session Request** - Expert requests incoming
2. **Session Accepted** - Expert accepted call/chat
3. **Session Completed** - Session ended
4. **Message** - New chat message
5. **Review** - Session review from other user
6. **Payment** - Payment confirmation

### Flow
```
Event Triggered → Create Notification in Supabase
              → Send Push Notification (if enabled)
              → Show In-App Toast/Modal
              → Store in user's notification list
```

---

## 👤 User Types & Roles

### Expert (Mentor)
- Set hourly/per-minute rates for:
  - Chat sessions
  - Audio calls
  - Video calls
- Accept/reject session requests
- View earnings and transaction history
- Manage availability
- Receive ratings and reviews

### Client
- Browse and search experts
- Request chat/call sessions
- Make payments via wallet top-up
- Rate and review sessions
- View session history
- Manage payment methods

---

## 💰 Wallet & Payment Flow

### Wallet Operations
1. **Top-up**
   - User selects amount
   - Choose payment gateway
   - Complete payment
   - Wallet balance updated

2. **Session Payment**
   - Deducted during call/chat
   - Real-time balance tracking
   - Insufficient balance check before session

3. **Expert Earnings**
   - Credited after session completion
   - Withdrawal available (via Razorpay/Cashfree)

### Transaction Lifecycle
```
Initiate → Validate Balance → Create Transaction (pending)
       ↓
Process Payment → Backend Verification
       ↓
Update Status (completed/failed)
       ↓
Update Wallet Balance in Firestore
```

---

## 🚀 Running the Application

### Available Scripts
```bash
npm start           # Start Expo dev server (interactive menu)
npm run dev         # Start with --clear flag
npm run android     # Build for Android
npm run ios         # Build for iOS
npm run web         # Run on web browser
npm run build:web   # Export as static web build
npm run lint        # Run ESLint
```

### Environment Variables
Create `.env` file with:
```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

EXPO_PUBLIC_RAZORPAY_KEY_ID=
EXPO_PUBLIC_CASHFREE_APP_ID=
```

### Platform Support
- ✅ iOS (13.4+)
- ✅ Android (5.0+)
- ✅ Web (Chrome, Safari, Firefox, Edge)

---

## 📊 Key Features

### For Experts
- 📝 Detailed profile with expertise areas
- 💰 Flexible pricing for chat/audio/video
- 📞 Accept/manage session requests
- ⭐ View ratings and reviews
- 📈 Analytics dashboard
- 💵 Earnings tracking and withdrawals

### For Clients
- 🔍 Advanced expert search and filtering
- 📅 Schedule sessions
- 💬 Real-time chat
- 📞 Audio/video calls
- ⭐ Rate and review sessions
- 💳 Multiple payment options
- 👛 Wallet management

### For Both
- 🔐 Secure authentication
- 🔔 Real-time notifications
- 📱 Cross-platform availability
- 🎯 Session history
- 🔐 Data privacy and security
- 🌙 Dark mode support

---

## 🔒 Security Features

### Authentication Security
- Firebase Authentication (industry standard)
- reCAPTCHA verification for phone auth
- OTP-based phone verification
- Secure token storage in Async Storage

### Data Security
- Firestore Security Rules
- Row-Level Security (RLS) on Supabase tables
- HTTPS/TLS encryption for all communications
- Sensitive data encrypted at rest

### Payment Security
- PCI-DSS compliance via payment gateways
- Signature verification on all transactions
- Webhook authentication
- No sensitive card data stored in app

---

## 🐛 Common Issues & Solutions

### Module Import Errors
**Problem:** "Unable to resolve module" errors
**Solution:** 
- Check path aliases in `tsconfig.json`
- Verify file extensions (.ts/.tsx)
- Clear cache: `npm run dev` (uses --clear)

### Firebase Connection Issues
**Problem:** Firebase not initializing
**Solution:**
- Verify environment variables are set
- Check Firebase project permissions
- Ensure app is in correct Firebase project

### Payment Gateway Issues
**Problem:** Payment orders not creating
**Solution:**
- Verify API keys in backend
- Check backend service is running
- Review transaction logs in payment dashboard

---

## 📚 Key Dependencies Version Matrix

| Package | Version | Purpose |
|---------|---------|---------|
| expo | 54.0.0 | Development framework |
| react-native | 0.79.1 | Mobile framework |
| firebase | 10.13.0 | Backend & database |
| @supabase/supabase-js | 2.39.0 | PostgreSQL client |
| axios | 1.13.2 | HTTP client |
| expo-router | 5.0.2 | Navigation |
| typescript | 5.8.3 | Type safety |

---

## 🎯 Development Workflow

### Adding a New Screen
1. Create file in `/app` directory (auto-routes)
2. Use `<AuthWrapper>` for protected routes
3. Import necessary hooks and components
4. Use Firestore API via `api.ts`
5. Add notifications if needed

### Adding New API Method
1. Add function to `/utils/api.ts`
2. Use Firestore SDK methods
3. Add TypeScript types
4. Error handling and logging
5. Use in components via imports

### Adding Payment Feature
1. Extend `paymentHandler.ts`
2. Use `razorpayService` or `cashfreeService`
3. Create transaction record
4. Verify webhook response
5. Update wallet in Firestore

---

## 📞 Support & Resources

- **Firebase Documentation:** https://firebase.google.com/docs
- **Supabase Documentation:** https://supabase.com/docs
- **Expo Documentation:** https://docs.expo.dev
- **React Native Docs:** https://reactnative.dev
- **Razorpay Integration:** https://razorpay.com/docs
- **Agora SDK:** https://docs.agora.io

---

*Last Updated: December 12, 2025*
*Version: 1.0.0*
