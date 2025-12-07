import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Bell, MessageCircle, Star, DollarSign, CheckCircle, AlertCircle } from 'lucide-react-native';
import { storage, StorageKeys } from '../utils/storage';
import { api } from '../utils/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: string;
}

interface UnreadMessage {
  sessionId: string;
  otherUserName: string;
  otherUserId: string;
  unreadCount: number;
  lastMessage: string;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessage[]>([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
    loadUnreadMessages();

    let notificationUnsubscribe: (() => void) | null = null;
    let messagesUnsubscribe: (() => void) | null = null;

    const setupRealtimeListeners = async () => {
      try {
        const profileData = await storage.getItem(StorageKeys.USER_PROFILE);
        if (!profileData?.id) return;

        notificationUnsubscribe = api.subscribeToNotifications(profileData.id, (notifs) => {
          setNotifications(notifs);
          setIsLoading(false);
        });

        messagesUnsubscribe = api.subscribeToUnreadMessages(profileData.id, (count) => {
          setTotalUnreadCount(count);
        });
      } catch (error) {
        console.error('Error setting up real-time listeners:', error);
      }
    };

    setupRealtimeListeners();

    return () => {
      if (notificationUnsubscribe) {
        notificationUnsubscribe();
      }
      if (messagesUnsubscribe) {
        messagesUnsubscribe();
      }
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const profileData = await storage.getItem(StorageKeys.USER_PROFILE);
      if (!profileData?.id) return;

      const notifs = await api.getNotifications(profileData.id);
      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const loadUnreadMessages = async () => {
    try {
      const profileData = await storage.getItem(StorageKeys.USER_PROFILE);
      if (!profileData?.id) return;

      const count = await api.getUnreadMessageCount(profileData.id);
      setTotalUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread messages:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.isRead) {
      await api.markNotificationAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      );
    }
    
    // Navigate to relevant screen based on notification type
    if (notification.type === 'message' && notification.data?.sessionId) {
      router.push(`/chat/${notification.data.senderId}`);
    }
  };

  const handleUnreadMessagePress = async (message: UnreadMessage) => {
    // Mark messages as read
    await api.markChatMessagesAsRead(message.sessionId, (await storage.getItem(StorageKeys.USER_PROFILE))?.id || '');
    
    // Navigate to chat
    router.push(`/chat/${message.otherUserId}`);
  };

  const handleMarkAllRead = async () => {
    try {
      const profileData = await storage.getItem(StorageKeys.USER_PROFILE);
      if (!profileData?.id) return;

      await api.markAllNotificationsAsRead(profileData.id);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle size={20} color="#2563EB" />;
      case 'review':
        return <Star size={20} color="#F59E0B" />;
      case 'payment':
      case 'session_completed':
        return <DollarSign size={20} color="#059669" />;
      case 'session_request':
      case 'session_accepted':
        return <CheckCircle size={20} color="#7C3AED" />;
      default:
        return <Bell size={20} color="#6B7280" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {(unreadCount > 0 || totalUnreadCount > 0) && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && totalUnreadCount === 0 && <View style={{ width: 40 }} />}
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Unread Messages Section */}
        {totalUnreadCount > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <MessageCircle size={18} color="#2563EB" />
              <Text style={styles.sectionTitle}>Unread Messages</Text>
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{totalUnreadCount}</Text>
              </View>
            </View>
            <View style={styles.messagesSummary}>
              <View style={styles.messageCountContainer}>
                <AlertCircle size={20} color="#EF4444" />
                <Text style={styles.messageSummaryText}>
                  You have {totalUnreadCount} unread {totalUnreadCount === 1 ? 'message' : 'messages'} waiting
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => router.push('/(tabs)/chat')}
              >
                <Text style={styles.viewAllButtonText}>View Messages</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Notifications Section */}
        {notifications.length === 0 && totalUnreadCount === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Bell size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>
              When you get notifications, they'll show up here
            </Text>
          </View>
        )}

        {notifications.length > 0 && totalUnreadCount > 0 && (
          <Text style={styles.notificationsLabel}>Other Notifications</Text>
        )}

        {notifications.map((notification) => (
          <TouchableOpacity
            key={notification.id}
            style={[
              styles.notificationCard,
              !notification.isRead && styles.notificationUnread,
            ]}
            onPress={() => handleNotificationPress(notification)}
          >
            <View style={styles.notificationIcon}>
              {getNotificationIcon(notification.type)}
            </View>
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                {notification.type === 'message' && (
                  <View style={styles.messageBadge}>
                    <MessageCircle size={16} color="#2563EB" />
                  </View>
                )}
              </View>
              <Text style={styles.notificationMessage}>

                {notification.message}
              </Text>
              <Text style={styles.notificationTime}>
                {formatTime(notification.createdAt)}
              </Text>
            </View>
            {!notification.isRead && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  markAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginLeft: 12,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },
  messagesSummary: {
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  messageCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  messageSummaryText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#991B1B',
    marginLeft: 12,
    flex: 1,
  },
  viewAllButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewAllButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  notificationsLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notificationUnread: {
    backgroundColor: '#EBF4FF',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    flex: 1,
  },
  messageBadge: {
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
});
