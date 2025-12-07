import { api } from './api';

/**
 * Creates a message notification with unread count
 * Call this when a new message is received
 */
export const createMessageNotification = async (
  recipientId: string,
  senderId: string,
  senderName: string,
  messageContent: string,
  unreadCount: number
) => {
  try {
    const title = `New message from ${senderName}`;
    const messagePreview = messageContent.length > 60 
      ? messageContent.substring(0, 60) + '...' 
      : messageContent;
    
    const message = unreadCount > 1 
      ? `${messagePreview} (${unreadCount} unread)`
      : messagePreview;

    await api.createNotification(
      recipientId,
      'message',
      title,
      message,
      { senderId, senderName, unreadCount }
    );
  } catch (error) {
    console.error('Error creating message notification:', error);
  }
};

/**
 * Creates a notification when a user receives multiple unread messages
 */
export const createBulkMessageNotification = async (
  recipientId: string,
  senderName: string,
  unreadCount: number
) => {
  try {
    const title = `${unreadCount} unread ${unreadCount === 1 ? 'message' : 'messages'} from ${senderName}`;
    const message = `You have ${unreadCount} unread ${unreadCount === 1 ? 'message' : 'messages'} to catch up on`;

    await api.createNotification(
      recipientId,
      'message',
      title,
      message,
      { senderName, unreadCount }
    );
  } catch (error) {
    console.error('Error creating bulk message notification:', error);
  }
};

/**
 * Formats unread message count for display
 */
export const formatUnreadCount = (count: number): string => {
  if (count === 0) return '';
  if (count > 99) return '99+';
  return count.toString();
};

/**
 * Gets unread count for a specific chat session
 */
export const getSessionUnreadCount = async (sessionId: string, userId: string): Promise<number> => {
  try {
    const count = await api.getUnreadMessageCount(userId);
    return count;
  } catch (error) {
    console.error('Error getting session unread count:', error);
    return 0;
  }
};

/**
 * Mark a chat session as read
 */
export const markChatAsRead = async (sessionId: string, userId: string) => {
  try {
    const result = await api.markChatMessagesAsRead(sessionId, userId);
    return result.success;
  } catch (error) {
    console.error('Error marking chat as read:', error);
    return false;
  }
};
