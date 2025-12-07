# Message Notification Features

## Overview
This document describes the newly implemented message notification system that keeps users informed about unread messages with real-time counts.

## Features Implemented

### 1. **Unread Message Counts**
- **Real-time Tracking**: Messages are tracked in real-time with counts displayed across multiple screens
- **Per-Session Counts**: Each chat session shows the number of unread messages from that specific user
- **Total Count**: The Messages tab header displays the total count of all unread messages across all conversations

### 2. **Visual Indicators**
- **Unread Badge**: Red badge showing unread count appears on:
  - Chat avatar in Messages tab (with count number)
  - Session card background highlighted in light red
  - Session name in bold red text
  - Unread indicator row below last message

- **Colors Used**:
  - Red badges: `#DC2626` (error red)
  - Light red backgrounds: `#FEF2F2`
  - Dark red text: `#991B1B`

### 3. **Notifications Screen**
The Notifications tab now displays:
- **Unread Messages Section** (appears at top when unread messages exist):
  - Shows total unread message count
  - Alert indicator with icon
  - Quick "View Messages" button to navigate to chat
  - Special styling with red border accent

- **Individual Notifications**:
  - Message notifications include message content preview
  - Display sender name
  - Show unread count in notification text
  - Navigate to relevant chat when tapped

### 4. **Automatic Notifications**
When a user sends a message:
- A notification is automatically created for the recipient
- Includes sender name and message preview
- Shows current unread count for that conversation
- Stored in Firestore with read/unread status

### 5. **Message Schema Updates**
Messages now include additional fields:
```
message {
  senderId: string
  senderName: string
  receiverId: string
  recipientId: string  // For unread tracking
  text: string
  isRead: boolean      // Message read status
  timestamp: Timestamp
  mediaType: 'text' | 'image'
  ...
}
```

## Files Modified

### Core Implementation Files:

1. **`utils/api.ts`**
   - Added `getUnreadMessageCount(userId)` - Get total unread count
   - Added `subscribeToUnreadMessages(userId, callback)` - Real-time unread count updates
   - Added `markChatMessagesAsRead(sessionId, userId)` - Mark messages as read
   - Enhanced message sending with notification creation

2. **`utils/notifications.ts`**
   - `createMessageNotification()` - Creates notification with unread count
   - `createBulkMessageNotification()` - For multiple unread messages
   - `formatUnreadCount()` - Format count for display
   - `markChatAsRead()` - Helper to mark chat as read
   - `getSessionUnreadCount()` - Get unread count for specific session

3. **`app/notifications.tsx`**
   - Added `UnreadMessage` interface
   - Added `unreadMessages` state tracking
   - Added `totalUnreadCount` state for badge
   - Created `Unread Messages` section with alert styling
   - Added `handleUnreadMessagePress()` to navigate to chats
   - Real-time subscription to unread message updates
   - Enhanced header with "Mark all read" functionality
   - New styling for unread section, badges, and indicators

4. **`app/(tabs)/chat.tsx`**
   - Enhanced `ChatSession` interface with `unreadCount` field
   - Added `totalUnreadCount` state in component
   - Updated `loadUserAndSessions()` to count unread per session
   - Enhanced `SessionCard` component with:
     - Unread badge on avatar
     - Highlighted background for unread chats
     - Bold text for unread senders
     - Unread indicator row
   - Added header badge showing total unread count
   - New styles for unread states and badges

5. **`app/chat/[expertId].tsx`**
   - Imported `createMessageNotification()` helper
   - Enhanced `handleSendMessage()` to:
     - Add `recipientId` to messages
     - Create notifications for recipients
     - Count unread messages when sending

## Usage Examples

### Get Total Unread Count
```typescript
const count = await api.getUnreadMessageCount(userId);
console.log(`You have ${count} unread messages`);
```

### Subscribe to Unread Count Changes
```typescript
const unsubscribe = api.subscribeToUnreadMessages(userId, (count) => {
  console.log(`Unread messages: ${count}`);
  setUnreadCount(count);
});

// Cleanup
return () => unsubscribe();
```

### Create Message Notification
```typescript
import { createMessageNotification } from '../utils/notifications';

await createMessageNotification(
  recipientId,
  senderId,
  senderName,
  messageContent,
  unreadCount
);
```

### Mark Messages as Read
```typescript
const success = await api.markChatMessagesAsRead(sessionId, userId);
```

## UI Components

### Unread Badge Component
- **Size**: 24px height, minimum width 24px
- **Style**: Red background (#DC2626), white text, bold font
- **Position**: Absolute on chat avatar (bottom-right)
- **Format**: Shows count number (capped at 99+)

### Unread Indicator Row
- **Components**: AlertCircle icon + text
- **Styling**: Light red background, dark red text
- **Text**: "X unread" format
- **Location**: Below last message in chat session

### Header Badge
- **Location**: Messages tab header
- **Style**: Red background, white bold number
- **Visibility**: Only shown when unread count > 0

### Unread Messages Section
- **Location**: Top of Notifications screen
- **Components**: 
  - Section header with icon and count badge
  - Alert box with message summary
  - "View Messages" button
- **Styling**: Light red background, red left border accent

## Firestore Structure
```
chat_sessions/
  {sessionId}/
    messages/
      {messageId}/
        senderId: string
        senderName: string
        recipientId: string
        isRead: boolean
        text: string
        timestamp: Timestamp
        ...

notifications/
  {notificationId}/
    userId: string
    type: 'message'
    title: string
    message: string
    data: {
      senderId: string
      senderName: string
      unreadCount: number
    }
    isRead: boolean
    createdAt: Timestamp
```

## Navigation Flow

1. **From Notifications Tab**:
   - Tap unread message count section → Goes to Messages/Chat tab
   - Tap individual message notification → Opens specific chat

2. **From Messages Tab**:
   - Unread chats highlighted in red
   - Tap any chat → Opens conversation
   - Messages auto-marked as read when viewing chat

3. **Header Badges**:
   - Messages tab shows total unread count
   - Chat cards show per-conversation unread count

## Future Enhancements

1. **Sound & Vibration Notifications**
   - Add device notifications with sound/haptic feedback
   - Use `expo-notifications` for push notifications

2. **Notification Preferences**
   - Allow users to customize notification settings
   - Sound, vibration, and notification frequency preferences

3. **Message Status**
   - Add "delivered" and "read receipts"
   - Show when other user has read messages

4. **Search & Filter**
   - Search notifications by content
   - Filter by message type

5. **Archive Chats**
   - Option to archive inactive conversations
   - Keep unread count separate from archived

## Testing Checklist

- [ ] Send message in one account
- [ ] Verify notification appears in recipient's Notifications tab
- [ ] Check unread count badge appears
- [ ] Verify count includes all unread messages
- [ ] Tap notification and open chat
- [ ] Verify messages marked as read
- [ ] Check count updates in real-time
- [ ] Verify total count in Messages tab header
- [ ] Test with multiple chat sessions
- [ ] Verify counts persist after app restart

## Troubleshooting

### Unread Count Not Updating
- Check Firestore Rules allow reading messages
- Verify `recipientId` field is set on messages
- Check subscription is active with `api.subscribeToUnreadMessages()`

### Notifications Not Appearing
- Verify `api.createNotification()` called on message send
- Check user ID is correct and consistent
- Verify Firestore permissions for notifications collection

### Badge Not Showing
- Check `unreadCount > 0` condition
- Verify styles are applied with `sessionCardUnread`
- Check if state is being updated properly

## Performance Considerations

- Subscriptions use real-time Firestore listeners (costs queries)
- Unread count queries run per-session in chat tab
- Consider pagination if many messages in conversation
- Badge updates debounced on notification changes

---

**Last Updated**: December 2025
**Version**: 1.0
