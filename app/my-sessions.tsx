import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Image, ActivityIndicator, SectionList } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, MessageCircle, Phone, CheckCircle, Clock, DollarSign, Star, User } from 'lucide-react-native';
import { db } from '../config/firebase';
import { collection, onSnapshot, getDoc, doc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { storage, StorageKeys } from '../utils/storage';
import { ensureMediaUrl } from '../utils/firebaseStorageUrl';

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
}

interface ScheduledSession {
  id: string;
  clientId: string;
  clientName: string;
  clientImage?: string;
  type: 'chat' | 'call';
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  duration: number;
  cost: number;
  rating?: number;
  scheduledAt?: any;
  completedAt?: any;
}

export default function MySessionsScreen() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const unsubscribeRef = React.useRef<(() => void) | null>(null);

  const loadUserAndSessions = async () => {
    try {
      setIsLoading(true);
      const profileData = await storage.getItem(StorageKeys.USER_PROFILE);
      if (!profileData?.id) {
        console.warn('[MySessions] No user profile found');
        setIsLoading(false);
        return;
      }

      setUserProfile(profileData);

      // Load chat sessions if user is not an expert
      if (profileData.userType !== 'expert') {
        console.log('[MySessions] Loading chat sessions for user:', profileData.id);
        const sessionsRef = collection(db, 'chat_sessions');
        
        // Create queries for sessions where user is user1 or user2
        const q1 = query(sessionsRef, where('user1Id', '==', profileData.id));
        
        // Subscribe to user1 sessions
        const unsubscribe1 = onSnapshot(q1, async (snapshot1) => {
          console.log('[MySessions] User1 sessions:', snapshot1.size);
          const activeSessions: ChatSession[] = [];

          for (const docSnap of snapshot1.docs) {
            const sessionData = docSnap.data();
            const { user1Id, user2Id, createdAt, lastMessageAt } = sessionData;

            console.log('[MySessions] Processing session:', docSnap.id);

            const otherUserId = user1Id === profileData.id ? user2Id : user1Id;

            try {
              const otherUserRef = doc(db, 'profiles', otherUserId);
              const otherUserSnap = await getDoc(otherUserRef);

              if (otherUserSnap.exists()) {
                const otherUserData = otherUserSnap.data();
                
                // Get last message
                const messagesRef = collection(db, 'chat_sessions', docSnap.id, 'messages');
                const messagesQuery = query(messagesRef, orderBy('timestamp', 'desc'));
                
                try {
                  const messagesSnap = await getDocs(messagesQuery);
                  let lastMessage = '';
                  let lastTime = lastMessageAt;
                  const messageCount = messagesSnap.docs.length;

                  if (messagesSnap.docs.length > 0) {
                    const lastMsg = messagesSnap.docs[0].data();
                    lastMessage = lastMsg.text?.substring(0, 50) || '';
                    lastTime = lastMsg.timestamp || lastMessageAt;
                  }

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
                    messageCount
                  });
                } catch (msgErr) {
                  console.log('[MySessions] No messages in session yet');
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
                    messageCount: 0
                  });
                }
              }
            } catch (err) {
              console.error('[MySessions] Error fetching user profile:', err);
            }
          }

          // Also get user2 sessions
          const q2 = query(sessionsRef, where('user2Id', '==', profileData.id));
          try {
            const snapshot2 = await getDocs(q2);
            console.log('[MySessions] User2 sessions:', snapshot2.size);

            for (const docSnap of snapshot2.docs) {
              const sessionData = docSnap.data();
              const { user1Id, user2Id, createdAt, lastMessageAt } = sessionData;

              const otherUserId = user1Id === profileData.id ? user2Id : user1Id;

              try {
                const otherUserRef = doc(db, 'profiles', otherUserId);
                const otherUserSnap = await getDoc(otherUserRef);

                if (otherUserSnap.exists()) {
                  const otherUserData = otherUserSnap.data();
                  
                  const messagesRef = collection(db, 'chat_sessions', docSnap.id, 'messages');
                  const messagesQuery = query(messagesRef, orderBy('timestamp', 'desc'));
                  
                  try {
                    const messagesSnap = await getDocs(messagesQuery);
                    let lastMessage = '';
                    let lastTime = lastMessageAt;
                    const messageCount = messagesSnap.docs.length;

                    if (messagesSnap.docs.length > 0) {
                      const lastMsg = messagesSnap.docs[0].data();
                      lastMessage = lastMsg.text?.substring(0, 50) || '';
                      lastTime = lastMsg.timestamp || lastMessageAt;
                    }

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
                      messageCount
                    });
                  } catch (msgErr) {
                    console.log('[MySessions] No messages in user2 session yet');
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
                      messageCount: 0
                    });
                  }
                }
              } catch (err) {
                console.error('[MySessions] Error fetching user2 profile:', err);
              }
            }
          } catch (err) {
            console.warn('[MySessions] Error fetching user2 sessions:', err);
          }

          console.log('[MySessions] ✓ Loaded', activeSessions.length, 'sessions');
          setSessions(activeSessions.sort((a, b) => {
            const timeA = a.lastMessageAt?.toDate?.() || new Date(a.lastMessageAt || 0);
            const timeB = b.lastMessageAt?.toDate?.() || new Date(b.lastMessageAt || 0);
            return timeB.getTime() - timeA.getTime();
          }));
          setIsLoading(false);
        }, (error: any) => {
          console.error('[MySessions] ✗ Listener error:', error?.code || error?.message || error);
          setIsLoading(false);
        });

        unsubscribeRef.current = unsubscribe1;
      } else {
        // Load expert sessions
        loadExpertSessions(profileData.id);
      }
    } catch (error) {
      console.error('[MySessions] ✗ Error loading sessions:', error);
      setIsLoading(false);
    }
  };

  const loadExpertSessions = async (expertId: string) => {
    try {
      // Query chat_sessions where expert is expert (one side) or user2 (other side)
      const sessionsRef = collection(db, 'chat_sessions');
      
      // Get sessions where user is user1 (expert side)
      const q1 = query(sessionsRef, where('user1Id', '==', expertId));
      
      // Subscribe to sessions
      const unsubscribe1 = onSnapshot(q1, async (snapshot1) => {
        console.log('[MySessions] Expert chat sessions (as user1):', snapshot1.size);
        const expert_sessions: ScheduledSession[] = [];

        // Process user1 sessions
        for (const docSnap of snapshot1.docs) {
          const sessionData = docSnap.data();
          const { user1Id, user2Id, createdAt, lastMessageAt } = sessionData;

          const otherUserId = user1Id === expertId ? user2Id : user1Id;

          try {
            const otherUserRef = doc(db, 'profiles', otherUserId);
            const otherUserSnap = await getDoc(otherUserRef);

            if (otherUserSnap.exists()) {
              const otherUserData = otherUserSnap.data();
              
              // Get message count
              const messagesRef = collection(db, 'chat_sessions', docSnap.id, 'messages');
              const messagesQuery = query(messagesRef, orderBy('timestamp', 'desc'));
              
              try {
                const messagesSnap = await getDocs(messagesQuery);
                const messageCount = messagesSnap.docs.length;

                expert_sessions.push({
                  id: docSnap.id,
                  clientId: otherUserId,
                  clientName: otherUserData.name || 'Unknown',
                  clientImage: ensureMediaUrl(otherUserData.avatarUrl),
                  type: 'chat',
                  status: 'active',
                  duration: 0,
                  cost: 0,
                  rating: 0,
                  scheduledAt: lastMessageAt || createdAt,
                  completedAt: lastMessageAt
                });
              } catch (msgErr) {
                console.log('[MySessions] No messages in user1 session yet');
                expert_sessions.push({
                  id: docSnap.id,
                  clientId: otherUserId,
                  clientName: otherUserData.name || 'Unknown',
                  clientImage: ensureMediaUrl(otherUserData.avatarUrl),
                  type: 'chat',
                  status: 'active',
                  duration: 0,
                  cost: 0,
                  rating: 0,
                  scheduledAt: createdAt,
                  completedAt: lastMessageAt
                });
              }
            }
          } catch (err) {
            console.error('[MySessions] Error fetching user profile for user1:', err);
          }
        }

        // Also get sessions where user is user2
        const q2 = query(sessionsRef, where('user2Id', '==', expertId));
        try {
          const snapshot2 = await getDocs(q2);
          console.log('[MySessions] Expert chat sessions (as user2):', snapshot2.size);

          for (const docSnap of snapshot2.docs) {
            const sessionData = docSnap.data();
            const { user1Id, user2Id, createdAt, lastMessageAt } = sessionData;

            const otherUserId = user1Id === expertId ? user2Id : user1Id;

            try {
              const otherUserRef = doc(db, 'profiles', otherUserId);
              const otherUserSnap = await getDoc(otherUserRef);

              if (otherUserSnap.exists()) {
                const otherUserData = otherUserSnap.data();
                
                const messagesRef = collection(db, 'chat_sessions', docSnap.id, 'messages');
                const messagesQuery = query(messagesRef, orderBy('timestamp', 'desc'));
                
                try {
                  const messagesSnap = await getDocs(messagesQuery);
                  const messageCount = messagesSnap.docs.length;

                  expert_sessions.push({
                    id: docSnap.id,
                    clientId: otherUserId,
                    clientName: otherUserData.name || 'Unknown',
                    clientImage: ensureMediaUrl(otherUserData.avatarUrl),
                    type: 'chat',
                    status: 'active',
                    duration: 0,
                    cost: 0,
                    rating: 0,
                    scheduledAt: lastMessageAt || createdAt,
                    completedAt: lastMessageAt
                  });
                } catch (msgErr) {
                  console.log('[MySessions] No messages in user2 session yet');
                  expert_sessions.push({
                    id: docSnap.id,
                    clientId: otherUserId,
                    clientName: otherUserData.name || 'Unknown',
                    clientImage: ensureMediaUrl(otherUserData.avatarUrl),
                    type: 'chat',
                    status: 'active',
                    duration: 0,
                    cost: 0,
                    rating: 0,
                    scheduledAt: createdAt,
                    completedAt: lastMessageAt
                  });
                }
              }
            } catch (err) {
              console.error('[MySessions] Error fetching user profile for user2:', err);
            }
          }
        } catch (err) {
          console.warn('[MySessions] Error fetching user2 sessions:', err);
        }

        // Sort by last message time (most recent first)
        expert_sessions.sort((a, b) => {
          const timeA = a.scheduledAt?.toDate?.() || new Date(a.scheduledAt || 0);
          const timeB = b.scheduledAt?.toDate?.() || new Date(b.scheduledAt || 0);
          return timeB.getTime() - timeA.getTime();
        });

        console.log('[MySessions] ✓ Loaded', expert_sessions.length, 'expert chat sessions');
        setScheduledSessions(expert_sessions);
        setIsLoading(false);
      }, (error: any) => {
        console.error('[MySessions] ✗ Expert listener error:', error);
        setIsLoading(false);
      });

      unsubscribeRef.current = unsubscribe1;
    } catch (error) {
      console.error('[MySessions] Error loading expert sessions:', error);
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      console.log('[MySessions] Screen focused, loading data');
      loadUserAndSessions();

      // Cleanup on unfocus
      return () => {
        if (unsubscribeRef.current) {
          console.log('[MySessions] Unsubscribing from listener');
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
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

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate?.() || new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#059669';
      case 'active':
        return '#2563EB';
      case 'scheduled':
        return '#F59E0B';
      case 'cancelled':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'active':
        return '●';
      case 'scheduled':
        return '⏱';
      case 'cancelled':
        return '✗';
      default:
        return '○';
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading sessions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render expert sessions view
  if (userProfile?.userType === 'expert') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Sessions</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {scheduledSessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Clock size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No sessions yet</Text>
              <Text style={styles.emptySubtext}>Your scheduled sessions will appear here</Text>
            </View>
          ) : (
            <View style={styles.sessionsContainer}>
              {scheduledSessions.map((session) => (
                <View key={session.id} style={styles.expertSessionCard}>
                  <View style={styles.sessionHeader}>
                    <Image
                      source={{
                        uri: session.clientImage || 'https://images.pexels.com/photos/3778603/pexels-photo-3778603.jpeg?auto=compress&cs=tinysrgb&w=400'
                      }}
                      style={styles.clientAvatar}
                    />
                    
                    <View style={styles.clientInfo}>
                      <View style={styles.clientNameRow}>
                        <Text style={styles.clientName}>{session.clientName}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(session.status) }]}>
                          <Text style={styles.statusText}>{getStatusIcon(session.status)} {session.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.sessionType}>
                        {session.type === 'chat' ? '💬 Chat' : '📞 Call'} • {session.duration} min
                      </Text>
                      <Text style={styles.sessionDate}>{formatDate(session.scheduledAt)}</Text>
                    </View>
                  </View>

                  <View style={styles.sessionDetails}>
                    <View style={styles.detailItem}>
                      <DollarSign size={16} color="#059669" />
                      <Text style={styles.detailLabel}>Earnings</Text>
                      <Text style={styles.detailValue}>₹{session.cost}</Text>
                    </View>
                    
                    {session.rating && (
                      <View style={styles.detailItem}>
                        <Star size={16} color="#F59E0B" />
                        <Text style={styles.detailLabel}>Rating</Text>
                        <Text style={styles.detailValue}>{session.rating.toFixed(1)}</Text>
                      </View>
                    )}
                    
                    <View style={styles.detailItem}>
                      <Clock size={16} color="#2563EB" />
                      <Text style={styles.detailLabel}>Duration</Text>
                      <Text style={styles.detailValue}>{session.duration} min</Text>
                    </View>
                  </View>

                  {session.status === 'active' && (
                    <TouchableOpacity style={styles.joinButton}>
                      <Phone size={16} color="#FFFFFF" />
                      <Text style={styles.joinButtonText}>Continue Session</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Render client chat sessions view
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageCircle size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No active chats</Text>
            <Text style={styles.emptySubtext}>Start a conversation with an expert</Text>
          </View>
        ) : (
          sessions.map((session) => (
            <TouchableOpacity
              key={session.id}
              style={styles.sessionCard}
              onPress={() => openChat(session)}
            >
              <Image
                source={{
                  uri: session.otherUserImage || 'https://images.pexels.com/photos/3778603/pexels-photo-3778603.jpeg?auto=compress&cs=tinysrgb&w=400'
                }}
                style={styles.avatar}
              />
              
              <View style={styles.sessionInfo}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName}>{session.otherUserName}</Text>
                  <Text style={styles.messageCount}>
                    {session.messageCount || 0} msg{session.messageCount !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {session.lastMessage || 'No messages yet'}
                </Text>
                <Text style={styles.chatStatus}>
                  {session.messageCount === 0 ? '📋 New Chat' : '💬 Active Chat'}
                </Text>
              </View>

              <View style={styles.timeInfo}>
                <Text style={styles.timeText}>{formatTime(session.lastMessageAt)}</Text>
              </View>
            </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937'
  },
  headerSpacer: {
    width: 24
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
  sessionsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  expertSessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  clientAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
    backgroundColor: '#E5E7EB'
  },
  clientInfo: {
    flex: 1,
  },
  clientNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sessionType: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  sessionDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  sessionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#E5E7EB',
    borderBottomColor: '#E5E7EB',
  },
  detailItem: {
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  joinButton: {
    flexDirection: 'row',
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  joinButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: '#E5E7EB'
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
    color: '#1F2937'
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
  chatStatus: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500'
  },
  timeInfo: {
    alignItems: 'flex-end',
    gap: 8
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF'
  }
});
