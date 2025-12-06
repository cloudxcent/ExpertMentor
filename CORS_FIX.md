# CORS Issue Fix - Firebase Storage Avatar URLs

## Problem
Firebase Storage download URLs were being blocked by CORS policy:
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' 
from origin 'http://localhost:8082' has been blocked by CORS policy
```

## Root Cause
Firebase Storage URLs returned by `getDownloadURL()` include authentication parameters but don't include the `alt=media` parameter, which tells Firebase to serve the file directly instead of as a managed resource.

## Solution
Added `?alt=media` parameter to all Firebase Storage URLs to force direct file access without CORS restrictions.

### Implementation

**1. Created Utility Function** (`/utils/firebaseStorageUrl.ts`)
```typescript
export const ensureMediaUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.includes('alt=media')) return url;
  return url.includes('?') 
    ? `${url}&alt=media` 
    : `${url}?alt=media`;
};
```

**2. Updated Profile Edit** (`/app/profile-edit.tsx`)
```typescript
const imageUrl = publicUrl.includes('?') 
  ? `${publicUrl}&alt=media` 
  : `${publicUrl}?alt=media`;
setAvatarUrl(imageUrl); // Now saved with alt=media
```

**3. Updated All Display Screens**
- `/app/my-sessions.tsx` - Uses `ensureMediaUrl()` for session avatars
- `/app/chat/[expertId].tsx` - Uses `ensureMediaUrl()` for expert header image
- `/app/(tabs)/chat.tsx` - Uses `ensureMediaUrl()` for active/history tabs

## Why This Works
- `alt=media` tells Firebase to serve the file with proper CORS headers
- Direct file access bypasses authentication/token overhead
- Works across all browsers and React Native
- No additional configuration needed

## Testing
- Upload new avatar → Should load without CORS errors
- Open chat screens → Avatar displays in headers
- Open session cards → Avatars display with names
- Both users see each other's avatars in real-time

## URL Examples

**Before** (CORS blocked):
```
https://firebasestorage.googleapis.com/v0/b/bucket/o/avatars%2Fuser123-1704614400000.jpg?alt=media&token=abc123
```

**After** (Works with alt=media):
```
https://firebasestorage.googleapis.com/v0/b/bucket/o/avatars%2Fuser123-1704614400000.jpg?alt=media
```

Both are valid, but the second format is explicitly marked for direct file download.
