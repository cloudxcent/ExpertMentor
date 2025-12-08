import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Image, ActivityIndicator, Badge, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MessageCircle, Clock, AlertCircle, Phone, Camera } from 'lucide-react-native';
import { db } from '../../config/firebase';
import { collection, onSnapshot, getDoc, doc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { auth } from '../../config/firebase';
import { storage, StorageKeys } from '../../utils/storage';
import { ensureMediaUrl } from '../../utils/firebaseStorageUrl';

interface ChatSession {
  id: string;
  user1Id: string;
  user2Id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserImage?: string;
  lastMessage?: string;
  lastMessageAt: any;
  createdAt: string;
  messageCount?: number;
  unreadCount?: number;
  isActive: boolean;
}

export default function ChatTabScreen() {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const loadUserAndSessions = async () => {
    try {
      setIsLoading(true);
      const profileData = await storage.getItem(StorageKeys.USER_PROFILE);
      if (!profileData?.id) {
        console.warn('[ChatTab] No user profile found');
        setIsLoading(false);
        return;
      }

      console.log('[ChatTab] Loading sessions for user:', profileData.id);
      const sessionsRef = collection(db, 'chat_sessions');
      
      const unsubscribe = onSnapshot(sessionsRef, async (snapshot) => {
        console.log('[ChatTab] Snapshot received:', snapshot.size, 'total sessions');
        const activeSessions: ChatSession[] = [];
        let totalUnread = 0;

        for (const docSnap of snapshot.docs) {
          const sessionData = docSnap.data();
          const { user1Id, user2Id, createdAt, lastMessageAt } = sessionData;

          // Check if current user is part of this session
          if (user1Id !== profileData.id && user2Id !== profileData.id) {
            continue;
          }

          console.log('[ChatTab] Processing session:', docSnap.id);

          const otherUserId = user1Id === profileData.id ? user2Id : user1Id;

          try {
            const otherUserRef = doc(db, 'profiles', otherUserId);
            const otherUserSnap = await getDoc(otherUserRef);

            if (otherUserSnap.exists()) {
              const otherUserData = otherUserSnap.data();
              
              // Get last message and count
              const messagesRef = collection(db, 'chat_sessions', docSnap.id, 'messages');
              const messagesQuery = query(messagesRef, orderBy('timestamp', 'desc'));
              
              try {
                const messagesSnap = await getDocs(messagesQuery);
                let lastMessage = '';
                let lastTime = lastMessageAt;
                const messageCount = messagesSnap.docs.length;

                // Count unread messages for current user
                const unreadQuery = query(
                  messagesRef,
                  where('recipientId', '==', profileData.id),
                  where('isRead', '==', false)
                );
                const unreadSnap = await getDocs(unreadQuery);
                const unreadCount = unreadSnap.size;
                totalUnread += unreadCount;

                if (messagesSnap.docs.length > 0) {
                  const lastMsg = messagesSnap.docs[0].data();
                  lastMessage = lastMsg.text?.substring(0, 50) || '';
                  lastTime = lastMsg.timestamp || lastMessageAt;
                }

                // Determine if chat is active (has messages in last 24 hours)
                const now = new Date();
                const lastMsgTime = lastTime?.toDate?.() || new Date(lastTime || 0);
                const diffMinutes = Math.floor((now.getTime() - lastMsgTime.getTime()) / 60000);
                const isActive = diffMinutes < 1440; // Active if message within 24 hours

                activeSessions.push({
                  id: docSnap.id,
                  user1Id,
                  user2Id,
                  otherUserId,
                  otherUserName: otherUserData.name || 'Unknown',
                  otherUserImage: ensureMediaUrl(otherUserData.avatarUrl),
                  lastMessage: lastMessage || 'No messages yet',
                  lastMessageAt: lastTime,
                  createdAt,
                  messageCount,
                  unreadCount,
                  isActive
                });
              } catch (msgErr) {
                console.log('[ChatTab] No messages in session yet');
                activeSessions.push({
                  id: docSnap.id,
                  user1Id,
                  user2Id,
                  otherUserId,
                  otherUserName: otherUserData.name || 'Unknown',
                  otherUserImage: ensureMediaUrl(otherUserData.avatarUrl),
                  lastMessage: 'No messages yet',
                  lastMessageAt,
                  createdAt,
                  messageCount: 0,
                  unreadCount: 0,
                  isActive: false
                });
              }
            }
          } catch (err) {
            console.error('[ChatTab] Error fetching user profile:', err);
          }
        }

        console.log('[ChatTab] ✓ Loaded', activeSessions.length, 'sessions with', totalUnread, 'unread messages');
        setTotalUnreadCount(totalUnread);
        setSessions(activeSessions.sort((a, b) => {
          const timeA = a.lastMessageAt?.toDate?.() || new Date(a.lastMessageAt || 0);
          const timeB = b.lastMessageAt?.toDate?.() || new Date(b.lastMessageAt || 0);
          return timeB.getTime() - timeA.getTime();
        }));
        setIsLoading(false);
      }, (error: any) => {
        console.error('[ChatTab] ✗ Listener error:', error?.code || error?.message || error);
        setIsLoading(false);
      });
    } catch (error) {
      console.error('[ChatTab] ✗ Error loading sessions:', error);
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadUserAndSessions();
    }, [])
  );

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate?.() || new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return `${Math.floor(diffMins / 1440)}d ago`;
    } catch {
      return '';
    }
  };

  const openChat = (session: ChatSession) => {
    router.push({
      pathname: '/chat/[expertId]',
      params: {
        expertId: session.otherUserId,
        expertName: session.otherUserName,
        expertImage: session.otherUserImage || ''
      }
    });
  };

  const startCall = (session: ChatSession, callType: 'audio' | 'video') => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    router.push({
      pathname: '/call/[expertId]',
      params: {
        expertId: session.otherUserId,
        expertName: session.otherUserName,
        expertImage: session.otherUserImage || '',
        callType: callType,
        callRate: '50', // Default call rate
        fromChat: 'true',
        chatSessionId: 'temp_id' // Will be updated later
      }
    });
  };

  const activeSessions = sessions.filter(s => s.isActive);
  const historySessions = sessions.filter(s => !s.isActive);

  const displaySessions = activeTab === 'active' ? activeSessions : historySessions;

  const SessionCard = ({ session }: { session: ChatSession }) => (
    <View style={[
      styles.sessionCard,
      session.unreadCount && session.unreadCount > 0 && styles.sessionCardUnread
    ]}>
      <TouchableOpacity 
        style={styles.sessionTouchable}
        onPress={() => openChat(session)}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri: session.otherUserImage || 'https://images.pexels.com/photos/3778603/pexels-photo-3778603.jpeg?auto=compress&cs=tinysrgb&w=400'
            }}
            style={styles.avatar}
          />
          {session.unreadCount && session.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{session.unreadCount}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.sessionInfo}>
          <View style={styles.userNameRow}>
            <Text style={[
              styles.userName,
              session.unreadCount && session.unreadCount > 0 && styles.userNameUnread
            ]}>
              {session.otherUserName}
            </Text>
            {session.messageCount > 0 && (
              <View style={styles.countContainer}>
                <Text style={styles.messageCount}>
                  {session.messageCount} msg{session.messageCount !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
          <Text style={[
            styles.lastMessage,
            session.unreadCount && session.unreadCount > 0 && styles.lastMessageUnread
          ]} numberOfLines={1}>
            {session.lastMessage || 'No messages yet'}
          </Text>
          <View style={styles.chatStatusRow}>
            <Text style={styles.chatStatus}>
              {session.messageCount === 0 ? '📋 New Chat' : '💬 Active Chat'}
            </Text>
            {session.unreadCount && session.unreadCount > 0 && (
              <View style={styles.unreadIndicator}>
                <AlertCircle size={14} color="#EF4444" />
                <Text style={styles.unreadIndicatorText}>{session.unreadCount} unread</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.timeInfo}>
          <Text style={styles.timeText}>{formatTime(session.lastMessageAt)}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.callButtonsContainer}>
        <TouchableOpacity 
          style={styles.callButton}
          onPress={() => startCall(session, 'audio')}
        >
          <Phone size={18} color="#10B981" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.videoCallButton}
          onPress={() => startCall(session, 'video')}
        >
          <Camera size={18} color="#3B82F6" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Messages</Text>
          {totalUnreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{totalUnreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active ({activeSessions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History ({historySessions.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading chats...</Text>
          </View>
        ) : displaySessions.length === 0 ? (
          <View style={styles.emptyState}>
            {activeTab === 'active' ? (
              <>
                <MessageCircle size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No active chats</Text>
                <Text style={styles.emptySubtext}>Start a conversation with an expert</Text>
              </>
            ) : (
              <>
                <Clock size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No chat history</Text>
                <Text style={styles.emptySubtext}>Your past chats will appear here</Text>
              </>
            )}
          </View>
        ) : (
          displaySessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937'
  },
  headerBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabActive: {
    borderBottomColor: '#2563EB'
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280'
  },
  tabTextActive: {
    color: '#2563EB'
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280'
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280'
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF'
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  sessionCardUnread: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA'
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB'
  },
  unreadBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11
  },
  sessionInfo: {
    flex: 1
  },
  userNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1
  },
  userNameUnread: {
    color: '#991B1B',
    fontWeight: '700'
  },
  countContainer: {
    marginLeft: 8
  },
  messageCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563EB',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  lastMessage: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4
  },
  lastMessageUnread: {
    color: '#1F2937',
    fontWeight: '500'
  },
  chatStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  chatStatus: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500'
  },
  unreadIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4
  },
  unreadIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626'
  },
  timeInfo: {
    alignItems: 'flex-end',
    gap: 8
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  sessionTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  callButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
    alignItems: 'center'
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#10B981'
  },
  videoCallButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3B82F6'
  }
});
