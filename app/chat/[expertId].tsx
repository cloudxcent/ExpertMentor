import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Phone, Video, MoreVertical, Wallet, Plus } from 'lucide-react-native';
import { db, auth } from '../../config/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, getDoc, doc, setDoc, getDocs } from 'firebase/firestore';
import { storage, StorageKeys } from '../../utils/storage';
import { ensureMediaUrl } from '../../utils/firebaseStorageUrl';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  timestamp: any;
  createdAt: string;
  isRead: boolean;
}

export default function ChatScreen() {
  const { expertId, expertName, expertImage, chatRate } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expertDetails, setExpertDetails] = useState<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const expert = Array.isArray(expertId) ? expertId[0] : expertId;

  useEffect(() => {
    initializeChat();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const initializeChat = async () => {
    try {
      console.log('[Chat] Initializing with params - expertId:', expert, 'expertName:', expertName);
      
      const profileData = await storage.getItem(StorageKeys.USER_PROFILE);
      if (!profileData?.id) {
        console.error('[Chat] ✗ No user ID found in storage');
        setIsLoading(false);
        router.back();
        return;
      }

      console.log('[Chat] ✓ Current user loaded:', profileData.id);
      setCurrentUserId(profileData.id);
      setCurrentUserName(profileData.name || 'User');

      if (!expert) {
        console.error('[Chat] ✗ No expert ID provided');
        setIsLoading(false);
        return;
      }

      const expertRef = doc(db, 'profiles', expert as string);
      const expertSnap = await getDoc(expertRef);
      if (expertSnap.exists()) {
        console.log('[Chat] ✓ Expert details loaded:', expertSnap.data().name);
        setExpertDetails(expertSnap.data());
      } else {
        console.warn('[Chat] ⚠ Expert profile not found in database');
      }

      const chatSessionId = [profileData.id, expert].sort().join('_');
      console.log('[Chat] Session ID:', chatSessionId);
      setSessionId(chatSessionId);

      const sessionRef = doc(db, 'chat_sessions', chatSessionId);
      const sessionSnap = await getDoc(sessionRef);
      if (!sessionSnap.exists()) {
        console.log('[Chat] Creating new session');
        await setDoc(sessionRef, {
          user1Id: profileData.id,
          user2Id: expert,
          createdAt: serverTimestamp(),
          lastMessageAt: serverTimestamp()
        });
      }

      try {
        const messagesRef = collection(db, 'chat_sessions', chatSessionId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));
        const snapshot = await getDocs(q);
        
        const initialMessages: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          initialMessages.push({
            id: doc.id,
            text: data.text || '',
            senderId: data.senderId || '',
            senderName: data.senderName || 'Unknown',
            receiverId: data.receiverId || '',
            timestamp: data.timestamp,
            createdAt: data.createdAt || new Date().toISOString(),
            isRead: data.isRead || false
          });
        });
        
        setMessages(initialMessages);
        console.log('[Chat] ✓ Loaded', initialMessages.length, 'messages');
      } catch (err) {
        console.log('[Chat] No messages yet');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('[Chat] ✗ Init error:', error);
      setIsLoading(false);
    }
  };

  // Set up real-time message listener
  useEffect(() => {
    if (!sessionId || !currentUserId) {
      return;
    }

    console.log('[Chat] 📡 Setting up listener for session:', sessionId);

    const messagesRef = collection(db, 'chat_sessions', sessionId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('[Chat] 📨 Listener snapshot:', snapshot.size, 'documents');
        const loadedMessages: Message[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          loadedMessages.push({
            id: doc.id,
            text: data.text || '',
            senderId: data.senderId || '',
            senderName: data.senderName || 'Unknown',
            receiverId: data.receiverId || '',
            timestamp: data.timestamp,
            createdAt: data.createdAt || new Date().toISOString(),
            isRead: data.isRead || false
          });
        });

        setMessages(loadedMessages);
        console.log('[Chat] ✓ Messages state updated:', loadedMessages.length);

        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      (error: any) => {
        console.error('[Chat] ✗ Listener error:', error?.code || error?.message || error);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      console.log('[Chat] 🔌 Unsubscribing listener');
      unsubscribe();
    };
  }, [sessionId, currentUserId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !sessionId || !currentUserId || !expert) {
      console.warn('[Chat] Cannot send - missing:', { 
        message: !!newMessage.trim(), 
        sessionId: !!sessionId, 
        currentUserId: !!currentUserId, 
        expert: !!expert 
      });
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      console.log('[Chat] 📤 Sending message:', { 
        sessionId, 
        from: currentUserId, 
        to: expert, 
        text: messageText.substring(0, 30) 
      });

      const sessionRef = doc(db, 'chat_sessions', sessionId);
      const messagesRef = collection(sessionRef, 'messages');

      const docRef = await addDoc(messagesRef, {
        text: messageText,
        senderId: currentUserId,
        senderName: currentUserName || 'User',
        receiverId: expert,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
        isRead: false
      });

      console.log('[Chat] ✓ Message saved:', docRef.id);

      await setDoc(sessionRef, { lastMessageAt: serverTimestamp() }, { merge: true });
      console.log('[Chat] ✓ Session updated');
    } catch (error: any) {
      console.error('[Chat] ✗ Send error:', error?.code || error?.message || error);
      setNewMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const getChatStatus = () => {
    if (!messages || messages.length === 0) {
      return 'New Chat';
    }
    const lastMsg = messages[messages.length - 1];
    const lastTime = lastMsg?.timestamp?.toDate?.() || new Date(lastMsg?.createdAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastTime.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'Active Now';
    if (diffMinutes < 60) return `Active ${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `Active ${Math.floor(diffMinutes / 60)}h ago`;
    return `Active ${Math.floor(diffMinutes / 1440)}d ago`;
  };

  const getUserMessageStats = () => {
    const userMessages = messages.filter(m => m.senderId === currentUserId).length;
    const expertMessages = messages.filter(m => m.senderId !== currentUserId).length;
    return { userMessages, expertMessages };
  };

  const startVoiceCall = () => {
    router.push({
      pathname: '/call/[expertId]',
      params: {
        expertId: Array.isArray(expertId) ? expertId[0] : expertId,
        expertName: Array.isArray(expertName) ? expertName[0] : expertName,
        callType: 'audio'
      }
    });
  };

  const startVideoCall = () => {
    router.push({
      pathname: '/call/[expertId]',
      params: {
        expertId,
        expertName,
        callType: 'video'
      }
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>

        <View style={styles.expertInfo}>
          {expertDetails?.avatarUrl && (
            <Image
              source={{ uri: ensureMediaUrl(expertDetails.avatarUrl) }}
              style={styles.expertImage}
            />
          )}
          <View>
            <Text style={styles.expertName}>{expertName || expertDetails?.name || 'Expert'}</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusText}>
                {expertDetails?.isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={startVoiceCall}>
            <Phone size={20} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={startVideoCall}>
            <Video size={20} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <MoreVertical size={20} color="#1F2937" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Rate Info */}
      <View style={styles.rateInfo}>
        <Text style={styles.rateText}>Chat Rate: ₹{chatRate || expertDetails?.chatRate || '0'}/min</Text>
      </View>

      {/* Chat Status & Info */}
      <View style={styles.chatInfoBar}>
        <View style={styles.chatStatusContainer}>
          <Text style={styles.chatStatusLabel}>
            {messages.length === 0 ? '📋 New Chat' : '💬 Active Chat'}
          </Text>
          <Text style={styles.chatStatusValue}>
            {messages.length === 0 
              ? 'Start the conversation' 
              : `${messages.length} message${messages.length === 1 ? '' : 's'} • ${getUserMessageStats().userMessages} sent • ${getUserMessageStats().expertMessages} received`}
          </Text>
        </View>
        <View style={styles.chatMetaContainer}>
          <Text style={styles.chatMeta}>{getChatStatus()}</Text>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No messages yet. Start the conversation!</Text>
            </View>
          ) : (
            messages.map((message, index) => {
              const isSender = message.senderId === currentUserId;
              return (
                <View
                  key={message.id || index}
                  style={[
                    styles.messageBubble,
                    isSender ? styles.userMessage : styles.expertMessage
                  ]}
                >
                  <Text style={[
                    styles.messageText,
                    isSender ? styles.userMessageText : styles.expertMessageText
                  ]}>
                    {message.text}
                  </Text>
                  <Text style={[
                    styles.timestamp,
                    isSender ? styles.userTimestamp : styles.expertTimestamp
                  ]}>
                    {message.timestamp?.toDate
                      ? message.timestamp.toDate().toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : new Date(message.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
            autoCapitalize="sentences"
            autoCorrect={true}
            returnKeyType="default"
            blurOnSubmit={false}
            editable={!isSending}
          />
          <TouchableOpacity
            style={[styles.sendButton, (isSending || !newMessage.trim()) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={isSending || !newMessage.trim()}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 12,
  },
  expertInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expertImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#E5E7EB'
  },
  expertName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#10B981',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  rateText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'Inter-Regular'
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 4,
  },
  expertMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  expertMessageText: {
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  userTimestamp: {
    color: '#E0E7FF',
  },
  expertTimestamp: {
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  chatInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F0F9FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  chatStatusContainer: {
    flex: 1,
  },
  chatStatusLabel: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
    marginBottom: 2,
  },
  chatStatusValue: {
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '500',
  },
  chatMetaContainer: {
    alignItems: 'flex-end',
  },
  chatMeta: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '500',
  }
});
