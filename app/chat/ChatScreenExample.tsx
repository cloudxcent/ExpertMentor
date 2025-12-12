/**
 * Chat Screen with Free Trial Implementation
 * Shows how to integrate 60-second free trial with chat UI
 * 
 * Features:
 * - Initialize free trial on first chat
 * - Show countdown timer
 * - Disable chat input when trial expires
 * - Re-enable chat when balance is added
 * - Real-time trial status updates
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';

// Import APIs
import { api, chatTrialApi, walletApi } from '../../utils/api';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: any;
  read: boolean;
}

interface TrialStatus {
  isTrialActive: boolean;
  secondsRemaining: number;
  chatEnabled: boolean;
  balanceRequired: boolean;
  message: string;
}

const ChatScreen: React.FC = () => {
  const route = useRoute<any>();
  const { sessionId, expertId, expertName } = route.params;
  const auth = getAuth();
  const userId = auth.currentUser?.uid || '';

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userBalance, setUserBalance] = useState(0);

  // Trial state
  const [trialStatus, setTrialStatus] = useState<TrialStatus>({
    isTrialActive: false,
    secondsRemaining: 0,
    chatEnabled: false,
    balanceRequired: false,
    message: '',
  });

  const [trialInitialized, setTrialInitialized] = useState(false);
  const trialUnsubscribeRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<any>(null);

  // Initialize chat and trial
  useEffect(() => {
    initializeChat();
    loadBalance();

    return () => {
      // Cleanup
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (trialUnsubscribeRef.current) {
        trialUnsubscribeRef.current();
      }
    };
  }, [sessionId, userId]);

  const initializeChat = async () => {
    try {
      setLoading(true);

      // Load existing messages
      await loadMessages();

      // Check if trial already exists for this session
      const existingTrial = await chatTrialApi.getTrialStatus(sessionId);

      if (!existingTrial.success || !existingTrial.data) {
        // Initialize new free trial
        const initResult = await chatTrialApi.initializeFreeTrial(
          sessionId,
          userId,
          expertId
        );

        if (initResult.success) {
          console.log('✅ Free trial initialized');
          setTrialInitialized(true);

          // Start countdown
          startTrialCountdown();

          // Subscribe to trial changes
          subscribeToTrialStatus();
        }
      } else {
        // Trial already exists, subscribe to it
        console.log('📌 Resuming existing trial');
        setTrialInitialized(true);
        subscribeToTrialStatus();
        startTrialCountdown();
      }

      setLoading(false);
    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'Failed to initialize chat');
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      // Load messages from Firestore via real-time listener
      // This would be set up in your actual chat implementation
      console.log('Loading messages for session:', sessionId);
      // setMessages(result.data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadBalance = async () => {
    try {
      const result = await walletApi.getBalance(userId);
      if (result.success) {
        setUserBalance(result.data?.balance || 0);
      }
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  };

  const subscribeToTrialStatus = () => {
    const unsubscribe = chatTrialApi.subscribeToTrialStatus(
      sessionId,
      (data: any) => {
        setTrialStatus({
          isTrialActive: data.isTrialActive,
          secondsRemaining: data.secondsRemaining,
          chatEnabled: data.chatEnabled,
          balanceRequired: data.balanceRequired,
          message: data.isTrialActive
            ? `⏳ Free trial: ${data.secondsRemaining}s remaining`
            : data.secondsRemaining <= 0 && userBalance === 0
              ? '❌ Free trial ended. Add balance to continue.'
              : '✅ Chat enabled',
        });
      }
    );

    trialUnsubscribeRef.current = unsubscribe || (() => {});
  };

  const startTrialCountdown = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current as any);
    }

    timerRef.current = setInterval(async () => {
      const result = await chatTrialApi.getTrialStatus(sessionId);

      if (result.success && result.data) {
        const secondsRemaining = result.data.secondsRemaining;

        // Update UI
        setTrialStatus((prev) => ({
          ...prev,
          secondsRemaining: Math.max(0, secondsRemaining),
          isTrialActive: secondsRemaining > 0,
          chatEnabled: secondsRemaining > 0 || userBalance > 0,
        }));

        // Critical warnings
        if (secondsRemaining === 10) {
          Alert.alert('⚠️ Warning', 'Only 10 seconds left in free trial!');
        }

        if (secondsRemaining === 5) {
          Alert.alert(
            '🚨 URGENT',
            'Trial ending in 5 seconds! Add balance to continue.'
          );
        }

        // When trial expires
        if (secondsRemaining <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current as any);
          }

          // Check if user has balance
          await loadBalance();

          if (userBalance <= 0) {
            Alert.alert(
              'Trial Expired',
              'Your free trial has ended. Please add balance to continue chatting.',
              [{ text: 'Add Balance', onPress: () => navigateToWallet() }]
            );

            // Disable chat
            await chatTrialApi.disableChatForExpiredTrial(sessionId);
          }
        }
      }
    }, 1000);
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      // Check if chat is enabled
      const canSend = await chatTrialApi.canSendMessage(
        sessionId,
        userId,
        userBalance
      );

      if (!canSend.success || !canSend.allowed) {
        Alert.alert('Chat Disabled', canSend.reason);

        if (canSend.reason.includes('Add balance')) {
          navigateToWallet();
        }
        return;
      }

      setSending(true);

      // Send message via Firestore
      // In your actual implementation, use Firestore to add message document:
      // await addDoc(collection(db, 'chat_sessions', sessionId, 'messages'), {
      //   senderId: userId,
      //   text: inputText,
      //   timestamp: Timestamp.now(),
      // });
      console.log('Sending message:', inputText);
      setInputText('');
      // Messages will update via real-time listener

      setSending(false);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setSending(false);
    }
  };

  const navigateToWallet = () => {
    // Navigate to wallet/balance screen
    console.log('Navigate to wallet to add balance');
    // this.props.navigation.navigate('Wallet');
  };

  const handleBalanceAdded = async () => {
    // Called when user adds balance from wallet
    await loadBalance();

    if (userBalance > 0 && !trialStatus.chatEnabled) {
      // Re-enable chat
      const result = await chatTrialApi.enableChatAfterBalance(sessionId);

      if (result.success) {
        Alert.alert('✅ Success', result.message);

        setTrialStatus((prev) => ({
          ...prev,
          chatEnabled: true,
          balanceRequired: false,
          message: '✅ Chat enabled! You can continue messaging now.',
        }));

        // Restart countdown or update UI
        setInputText('');
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Trial Status Header */}
      {trialStatus.message && (
        <View
          style={[
            styles.trialBanner,
            {
              backgroundColor: trialStatus.chatEnabled
                ? '#E8F5E9'
                : '#FFEBEE',
            },
          ]}
        >
          <Text
            style={[
              styles.trialText,
              {
                color: trialStatus.chatEnabled ? '#2E7D32' : '#C62828',
              },
            ]}
          >
            {trialStatus.message}
          </Text>

          {trialStatus.isTrialActive && (
            <Text style={styles.timerText}>
              {String(Math.floor(trialStatus.secondsRemaining / 60)).padStart(2, '0')}:
              {String(trialStatus.secondsRemaining % 60).padStart(2, '0')}
            </Text>
          )}
        </View>
      )}

      {/* Messages */}
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageBox,
              {
                alignSelf:
                  item.senderId === userId ? 'flex-end' : 'flex-start',
              },
            ]}
          >
            <Text style={styles.messageText}>{item.text}</Text>
            <Text style={styles.timeText}>
              {new Date(item.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
      />

      {/* Chat Input - Disabled if chat is not enabled */}
      <View
        style={[
          styles.inputContainer,
          {
            opacity: trialStatus.chatEnabled ? 1 : 0.5,
          },
        ]}
      >
        <TextInput
          style={styles.input}
          placeholder={
            trialStatus.chatEnabled
              ? 'Type a message...'
              : 'Add balance to continue...'
          }
          placeholderTextColor="#999"
          value={inputText}
          onChangeText={setInputText}
          editable={trialStatus.chatEnabled}
          multiline
          maxLength={500}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              opacity: trialStatus.chatEnabled && !sending ? 1 : 0.6,
            },
          ]}
          onPress={sendMessage}
          disabled={!trialStatus.chatEnabled || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* CTA to add balance */}
      {trialStatus.balanceRequired && userBalance === 0 && (
        <TouchableOpacity
          style={styles.addBalanceButton}
          onPress={navigateToWallet}
        >
          <Text style={styles.addBalanceText}>💳 Add Balance to Continue</Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trialBanner: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trialText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    minWidth: 50,
    textAlign: 'right',
  },
  messagesList: {
    flex: 1,
    padding: 10,
  },
  messageBox: {
    maxWidth: '80%',
    marginVertical: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#E3F2FD',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  addBalanceButton: {
    margin: 10,
    padding: 15,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    alignItems: 'center',
  },
  addBalanceText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatScreen;
