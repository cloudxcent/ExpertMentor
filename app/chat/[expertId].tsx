import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, FlatList, Alert } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Phone, Camera, MoreVertical, Wallet, Plus, Smile, ImagePlus, X } from 'lucide-react-native';
import { db, auth } from '../../config/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, getDoc, doc, setDoc, getDocs, updateDoc } from 'firebase/firestore';
import { ensureMediaUrl } from '../../utils/firebaseStorageUrl';
import { createMessageNotification } from '../../utils/notifications';
import { api } from '../../utils/api.firebase';
import { formatCurrency } from '../../utils/pricing';
import * as ImagePicker from 'expo-image-picker';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  timestamp: any;
  createdAt: string;
  isRead: boolean;
  imageUrl?: string;
  mediaType?: 'image' | 'text';
}

const EMOJIS = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😲', '😳', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '💅', '💪', '👂', '👃', '🧠', '🦷', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎳', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '⛳', '🎣', '🎯', '🎮', '🎲', '🎰', '🎪', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎻', '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🍞', '🥐', '🥯', '🍠', '🥔', '🍟', '🍗', '🍖', '🌭', '🍔', '🍕', '🥪', '🥙', '🌮', '🌯', '🥗', '🥘', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚', '🍘', '🍥', '🍢', '🍡', '🍧', '🍨', '🍦', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '☕', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂'];

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageViewerModal, setImageViewerModal] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  
  // Balance checking states
  const [userBalance, setUserBalance] = useState<number>(0);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [chatRatePerMinute, setChatRatePerMinute] = useState<number>(0);
  const [callRatePerMinute, setCallRatePerMinute] = useState<number>(0);
  const [isRateLoaded, setIsRateLoaded] = useState(false);
  
  // Session billing states
  const [isChatActive, setIsChatActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [deductedAmount, setDeductedAmount] = useState<number>(0);
  const [hasAddedBalance, setHasAddedBalance] = useState(false);
  const [payerId, setPayerId] = useState<string | null>(null); // Track who initiated/paid for chat
  
  const scrollViewRef = useRef<ScrollView>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const hasScrolledRef = useRef(false);

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
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error('[Chat] ✗ No authenticated user found');
        setIsLoading(false);
        router.back();
        return;
      }

      console.log('[Chat] ✓ Current user loaded:', currentUser.uid);
      setCurrentUserId(currentUser.uid);
      setCurrentUserName(currentUser.displayName || 'User');

      // Check user wallet balance
      try {
        setIsCheckingBalance(true);
        const balanceResult = await api.getWalletBalance(currentUser.uid);
        const balance = balanceResult.success ? (balanceResult.balance || 0) : 0;
        setUserBalance(balance);
        console.log('[Chat] ✓ User balance loaded:', balance);
      } catch (balanceError) {
        console.warn('[Chat] ⚠ Error checking balance:', balanceError);
        setUserBalance(0);
      } finally {
        setIsCheckingBalance(false);
      }

      if (!expert) {
        console.error('[Chat] ✗ No expert ID provided');
        setIsLoading(false);
        return;
      }

      const expertRef = doc(db, 'profiles', expert as string);
      const expertSnap = await getDoc(expertRef);
      let resolvedChatRate = 5;
      let resolvedCallRate = 5;

      if (expertSnap.exists()) {
        console.log('[Chat] ✓ Expert details loaded:', expertSnap.data().name);
        setExpertDetails(expertSnap.data());
        
        // Get expert's chat and call rates (stored as chatRate and callRate in profile, which are per-minute)
        const expertData = expertSnap.data();
        resolvedChatRate = expertData.chatRate ? parseFloat(expertData.chatRate) : (parseFloat(chatRate as string) || 5);
        resolvedCallRate = expertData.callRate ? parseFloat(expertData.callRate) : resolvedChatRate;
        setChatRatePerMinute(resolvedChatRate);
        setCallRatePerMinute(resolvedCallRate);
        setIsRateLoaded(true);
        console.log('[Chat] ✓ Chat rate per minute set to:', resolvedChatRate, 'Call rate per minute set to:', resolvedCallRate, 'from expert profile');
      } else {
        console.warn('[Chat] ⚠ Expert profile not found in database');
        // Use passed chatRate or default
        resolvedChatRate = parseFloat(chatRate as string) || 5;
        resolvedCallRate = resolvedChatRate;
        setChatRatePerMinute(resolvedChatRate);
        setCallRatePerMinute(resolvedCallRate);
        setIsRateLoaded(true);
        console.log('[Chat] ✓ Chat rate per minute set to:', resolvedChatRate, 'Call rate per minute set to:', resolvedCallRate, 'from params');
      }

      const chatSessionId = [currentUser.uid, expert].sort().join('_');
      console.log('[Chat] Session ID:', chatSessionId);
      setSessionId(chatSessionId);

      const sessionRef = doc(db, 'chat_sessions', chatSessionId);
      const sessionSnap = await getDoc(sessionRef);
      if (!sessionSnap.exists()) {
        console.log('[Chat] Creating new session with initiator as payer');
        setPayerId(currentUser.uid); // Current user is the one who initiated/paid
        await setDoc(sessionRef, {
          user1Id: currentUser.uid,
          user2Id: expert,
          payerId: currentUser.uid, // Track who paid for this chat
          createdAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          isActive: true // Chat is active from the start
        });
        // Auto-enable chat for initiator
        setIsChatActive(true);
        setSessionStartTime(Date.now());
        setDeductedAmount(0);
        console.log('[Chat] ✅ Chat auto-enabled for payer (initiator)');
      } else {
        // Session exists - check if current user is the payer
        const existingPayerId = sessionSnap.data().payerId || sessionSnap.data().user1Id;
        setPayerId(existingPayerId);
        
        if (currentUser.uid === existingPayerId) {
          // Current user is the payer - check balance
          if (userBalance >= chatRatePerMinute) {
            // Payer has sufficient balance
            setIsChatActive(true);
            setSessionStartTime(Date.now());
            setDeductedAmount(0);
            console.log('[Chat] ✅ Chat enabled for payer with sufficient balance');
          } else {
            // Payer needs to add balance
            console.log('[Chat] ⚠ Payer needs to add balance. Current:', userBalance, 'Required:', chatRatePerMinute);
          }
        } else {
          // Current user is the receiver - no billing needed, chat enabled by default
          setIsChatActive(true);
          console.log('[Chat] ✅ Chat auto-enabled for receiver (expert - joins free)');
        }
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
            isRead: data.isRead || false,
            imageUrl: data.imageUrl,
            mediaType: data.mediaType || 'text'
          });
        });
        
        setMessages(initialMessages);
        console.log('[Chat] ✓ Loaded', initialMessages.length, 'messages');

        // Mark all messages as read for the current user
        try {
          const unreadQuery = query(
            messagesRef,
            where('recipientId', '==', currentUser.uid),
            where('isRead', '==', false)
          );
          const unreadSnapshot = await getDocs(unreadQuery);
          
          if (unreadSnapshot.size > 0) {
            console.log('[Chat] ✓ Marking', unreadSnapshot.size, 'messages as read');
            const updatePromises = unreadSnapshot.docs.map((doc) =>
              updateDoc(doc.ref, { isRead: true })
            );
            await Promise.all(updatePromises);
          }
        } catch (readError) {
          console.log('[Chat] ⚠ Error marking messages as read:', readError);
        }
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
      console.log('[Chat] 🚫 Listener setup skipped - sessionId:', sessionId, 'currentUserId:', currentUserId);
      return;
    }

    // Reset scroll flag when setting up listener
    hasScrolledRef.current = false;

    console.log('[Chat] 📡 Setting up listener for session:', sessionId, 'current user:', currentUserId);

    const messagesRef = collection(db, 'chat_sessions', sessionId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('[Chat] 📨 Listener snapshot received:', snapshot.size, 'documents for session:', sessionId);
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
            isRead: data.isRead || false,
            imageUrl: data.imageUrl,
            mediaType: data.mediaType || 'text'
          });
        });

        setMessages(loadedMessages);
        console.log('[Chat] ✓ Messages state updated with', loadedMessages.length, 'messages');

        // Delay scroll to ensure messages are rendered
        setTimeout(() => {
          try {
            scrollViewRef.current?.scrollToEnd({ animated: false });
          } catch (error) {
            console.log('[Chat] Scroll error:', error);
          }
        }, 200);
      },
      (error: any) => {
        console.error('[Chat] ✗ Listener error:', error?.code || error?.message || error);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      console.log('[Chat] 🔌 Unsubscribing listener for session:', sessionId);
      unsubscribe();
    };
  }, [sessionId, currentUserId]);

  // Auto-refresh balance when screen regains focus (after returning from wallet)
  useFocusEffect(
    useCallback(() => {
      const refreshBalance = async () => {
        try {
          const currentUser = auth.currentUser;
          if (currentUser) {
            const balanceResult = await api.getWalletBalance(currentUser.uid);
            const balance = balanceResult.success ? (balanceResult.balance || 0) : 0;
            setUserBalance(balance);
            console.log('[Chat] ✓ Balance refreshed on screen focus:', balance);
            
            // If user added balance, enable chat immediately
            if (balance >= chatRatePerMinute && !isChatActive) {
              setHasAddedBalance(true);
              setShowBalanceModal(false);
              setIsChatActive(true);
              setSessionStartTime(Date.now());
              setDeductedAmount(0);
              console.log('[Chat] ✓ User added balance, auto-enabling chat');
            }
          }
        } catch (balanceError) {
          console.warn('[Chat] ⚠ Error refreshing balance:', balanceError);
        }
      };

      refreshBalance();
    }, [isChatActive, chatRatePerMinute])
  );

  // Auto-deduct balance per minute ONLY from payer, not receiver
  useEffect(() => {
    if (!isChatActive || !sessionStartTime || userBalance <= 0 || !payerId) {
      return;
    }

    // Only run billing for the payer
    const isPayingUser = payerId === currentUserId;
    if (!isPayingUser) {
      console.log('[Chat] Current user is receiver - no billing applied');
      return;
    }

    const billingInterval = setInterval(async () => {
      const elapsedSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
      const elapsedMinutes = Math.ceil(elapsedSeconds / 60);
      const expectedDeduction = elapsedMinutes * chatRatePerMinute;
      const deductionNeeded = expectedDeduction - deductedAmount;

      if (deductionNeeded >= chatRatePerMinute && userBalance >= chatRatePerMinute) {
        console.log('[Chat] 💳 Deducting ₹', chatRatePerMinute, 'from payer for', elapsedMinutes, 'minute(s)');
        
        // Update local balance
        const newBalance = userBalance - chatRatePerMinute;
        setUserBalance(newBalance);
        setDeductedAmount(expectedDeduction);

        // Update Firestore wallet - ONLY for payer
        try {
          const currentUser = auth.currentUser;
          if (currentUser) {
            const walletRef = doc(db, 'wallet_balance', currentUser.uid);
            await updateDoc(walletRef, {
              balance: newBalance,
              lastDeductedAt: serverTimestamp(),
              lastSessionId: sessionId,
              totalDeducted: (deductedAmount + chatRatePerMinute)
            });
            console.log('[Chat] ✓ Payer wallet updated. New balance:', newBalance);
          }
        } catch (error) {
          console.error('[Chat] ✗ Error updating payer wallet:', error);
        }
      } else if (userBalance < chatRatePerMinute) {
        // Payer's balance exhausted - end session
        console.log('[Chat] ✗ Payer balance exhausted. Ending session.');
        setIsChatActive(false);
        setShowBalanceModal(true);
        Alert.alert('Balance Exhausted', 'Your chat session has ended due to insufficient balance.');
      }
    }, 60000); // Every minute

    return () => clearInterval(billingInterval);
  }, [isChatActive, sessionStartTime, userBalance, chatRatePerMinute, deductedAmount, payerId, currentUserId]);

  // Auto-show balance modal ONLY if current user is the payer AND has insufficient balance
  // Other party (receiver) joins free
  useEffect(() => {
    if (isRateLoaded && isLoading === false && payerId && currentUserId) {
      const isCurrentUserPayer = payerId === currentUserId;
      
      if (isCurrentUserPayer && !hasAddedBalance) {
        // Current user is payer - check balance
        if (userBalance < chatRatePerMinute) {
          console.log('[Chat] ✓ Current user is payer - showing balance modal. Balance:', userBalance, 'Rate:', chatRatePerMinute);
          setShowBalanceModal(true);
        } else {
          // Payer has sufficient balance
          setShowBalanceModal(false);
          setIsChatActive(true);
          setSessionStartTime(Date.now());
          setDeductedAmount(0);
          console.log('[Chat] ✅ Payer has sufficient balance - chat enabled');
        }
      } else if (!isCurrentUserPayer) {
        // Current user is receiver (not payer) - always enable chat
        console.log('[Chat] ✅ Current user is receiver - chat auto-enabled for free');
        setShowBalanceModal(false);
        setIsChatActive(true);
      } else if (hasAddedBalance && userBalance >= chatRatePerMinute) {
        // Payer added balance
        setShowBalanceModal(false);
        setIsChatActive(true);
        setSessionStartTime(Date.now());
        setDeductedAmount(0);
        console.log('[Chat] ✅ Payer added balance - chat enabled');
      }
    }
  }, [isRateLoaded, userBalance, chatRatePerMinute, isLoading, hasAddedBalance, payerId, currentUserId]);

  const pickImage = async () => {
    alert('Image uploads are temporarily disabled. Please use text messages.');
    return;
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    // Keep emoji picker open
  };

  const handleSendMessage = async () => {
    // Only check if chat is active (balance has been added and session started)
    if (!isChatActive) {
      console.log('[Chat] ✗ Chat not active. Please add balance to continue.');
      setShowBalanceModal(true);
      return;
    }

    if (!newMessage.trim() && !selectedImage) {
      return;
    }

    if (!sessionId || !currentUserId) {
      return;
    }

    setIsSending(true);

    try {
      const messageText = newMessage.trim();
      
      if (!messageText && !selectedImage) {
        setIsSending(false);
        return;
      }

      const sessionRef = doc(db, 'chat_sessions', sessionId);
      const messagesRef = collection(sessionRef, 'messages');

      const messageData: any = {
        text: messageText || (selectedImage ? '📸 Image' : ''),
        senderId: currentUserId,
        senderName: currentUserName || 'User',
        receiverId: expert,
        recipientId: expert, // Add recipientId for unread tracking
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
        isRead: false,
        mediaType: selectedImage ? 'image' : 'text',
        sessionId: sessionId,
        billedAmount: chatRatePerMinute
      };

      // Store image as base64 data URI if selected
      if (selectedImage) {
        messageData.imageUrl = selectedImage;
      }

      const docRef = await addDoc(messagesRef, messageData);

      console.log('[Chat] ✓ Message saved:', docRef.id, '| Billing rate applied:', chatRatePerMinute);

      await setDoc(sessionRef, { 
        lastMessageAt: serverTimestamp(),
        isActive: true,
        lastBilledAmount: chatRatePerMinute,
        messageCount: messages.length + 1
      }, { merge: true });
      console.log('[Chat] ✓ Session updated with billing info');

      // Create notification for the recipient with unread count
      try {
        const messagesRef = collection(db, 'chat_sessions', sessionId, 'messages');
        const unreadQuery = query(
          messagesRef,
          where('recipientId', '==', expert),
          where('isRead', '==', false)
        );
        const unreadSnap = await getDocs(unreadQuery);
        const unreadCount = unreadSnap.size;

        await createMessageNotification(
          expert,
          currentUserId,
          currentUserName || 'User',
          messageText || '📸 Image',
          unreadCount
        );
        console.log('[Chat] ✓ Notification created for recipient');
      } catch (notifError) {
        console.warn('[Chat] ⚠ Failed to create notification:', notifError);
        // Don't fail message send if notification fails
      }

      setNewMessage('');
      setSelectedImage(null);
      setShowEmojiPicker(false);
    } catch (error: any) {
      console.error('[Chat] ✗ Send error:', error?.code || error?.message || error);
    } finally {
      setIsSending(false);
    }
  };

  const downloadProfileImage = () => {
    // Instead of downloading, navigate to expert profile
    router.push({
      pathname: '/expert-detail/[expertId]',
      params: {
        expertId: expert
      }
    });
  };

  const openImageViewer = (imageUrl: string) => {
    setViewingImageUrl(ensureMediaUrl(imageUrl));
    setImageViewerModal(true);
  };

  const downloadImage = async (imageUrl: string) => {
    try {
      if (!imageUrl) {
        alert('No image to download');
        return;
      }

      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const fileName = `chat-image_${Date.now()}.jpg`;
        
        // For web, trigger download
        if (Platform.OS === 'web') {
          const link = document.createElement('a');
          link.href = `data:image/jpeg;base64,${base64}`;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          console.log('[Chat] Image downloaded:', fileName);
          alert(`Image saved as ${fileName}`);
        } else {
          // For mobile, save to local file system
          try {
            const docDir = (FileSystem as any).documentDirectory;
            if (docDir) {
              const fileUri = `${docDir}${fileName}`;
              await FileSystem.writeAsStringAsync(fileUri, base64, {
                encoding: 'base64' as any,
              });
              console.log('[Chat] Image saved to:', fileUri);
              alert(`Image saved to Downloads`);
            } else {
              console.warn('[Chat] Document directory not available on this platform');
              alert('Cannot save to file system on this platform');
            }
          } catch (fsError) {
            console.warn('[Chat] Could not save to file system:', fsError);
            alert('Could not save image to file system');
          }
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('[Chat] Download error:', error);
      alert('Failed to download image');
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
    // Check balance before allowing voice call
    if (userBalance < callRatePerMinute) {
      console.log('[Chat] ✗ Insufficient balance for voice call. User balance:', userBalance, 'Call rate:', callRatePerMinute);
      setShowBalanceModal(true);
      return;
    }

    router.push({
      pathname: '/call/[expertId]',
      params: {
        expertId: Array.isArray(expertId) ? expertId[0] : expertId,
        expertName: Array.isArray(expertName) ? expertName[0] : expertName,
        callType: 'audio',
        callRate: callRatePerMinute.toString()
      }
    });
  };

  const startVideoCall = () => {
    // Check balance before allowing video call
    if (userBalance < callRatePerMinute) {
      console.log('[Chat] ✗ Insufficient balance for video call. User balance:', userBalance, 'Call rate:', callRatePerMinute);
      setShowBalanceModal(true);
      return;
    }

    router.push({
      pathname: '/call/[expertId]',
      params: {
        expertId: Array.isArray(expertId) ? expertId[0] : expertId,
        expertName: Array.isArray(expertName) ? expertName[0] : expertName,
        callType: 'video',
        callRate: callRatePerMinute.toString()
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
            <TouchableOpacity onPress={downloadProfileImage}>
              <Image
                source={{ uri: ensureMediaUrl(expertDetails.avatarUrl) }}
                style={styles.expertImage}
              />
            </TouchableOpacity>
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
          <TouchableOpacity 
            style={[styles.callButton, (!isRateLoaded || userBalance < callRatePerMinute) && styles.disabledButton]}
            onPress={startVoiceCall}
            disabled={!isRateLoaded || userBalance < callRatePerMinute}
          >
            <Phone size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.videoCallButton, (!isRateLoaded || userBalance < callRatePerMinute) && styles.disabledButton]}
            onPress={startVideoCall}
            disabled={!isRateLoaded || userBalance < callRatePerMinute}
          >
            <Camera size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreButton}>
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
        style={[styles.content, { flex: showEmojiPicker ? 0.6 : 1 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (!hasScrolledRef.current) {
              scrollViewRef.current?.scrollToEnd({ animated: false });
              hasScrolledRef.current = true;
            }
          }}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No messages yet. Start the conversation!</Text>
            </View>
          ) : (
            messages.map((message, index) => {
              const isSender = message.senderId === currentUserId;
              const safeImageUrl = message.imageUrl ? ensureMediaUrl(message.imageUrl) : null;
              
              return (
                <View
                  key={message.id || index}
                  style={[
                    styles.messageBubble,
                    isSender ? styles.userMessage : styles.expertMessage
                  ]}
                >
                  {safeImageUrl && (
                    <TouchableOpacity 
                      style={styles.imageWrapper}
                      onPress={() => openImageViewer(safeImageUrl)}
                    >
                      <Image
                        source={{ uri: safeImageUrl }}
                        style={styles.messageImage}
                        resizeMode="cover"
                        onError={(e) => {
                          console.log('[Chat] ❌ Image load error for URL:', safeImageUrl, 'Error:', e.nativeEvent.error);
                        }}
                        onLoadStart={() => {
                          console.log('[Chat] 📸 Loading image:', safeImageUrl);
                        }}
                        onLoad={() => {
                          console.log('[Chat] ✅ Image loaded successfully');
                        }}
                      />
                    </TouchableOpacity>
                  )}
                  {message.text && (
                    <Text style={[
                      styles.messageText,
                      isSender ? styles.userMessageText : styles.expertMessageText
                    ]}>
                      {message.text}
                    </Text>
                  )}
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

        {/* Image Preview */}
        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.imagePreview}
              resizeMode="cover"
              onError={(e) => console.log('[Chat] Preview image error:', e)}
            />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setSelectedImage(null)}
            >
              <X size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Emoji Picker Modal */}
        {showEmojiPicker && (
          <View style={styles.emojiPickerContainer}>
            <View style={styles.emojiPickerHeader}>
              <Text style={styles.emojiPickerTitle}>Emojis</Text>
              <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                <X size={20} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={EMOJIS}
              keyExtractor={(item, index) => index.toString()}
              numColumns={8}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              contentContainerStyle={styles.emojiGridContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.emojiButton}
                  onPress={() => {
                    insertEmoji(item);
                  }}
                >
                  <Text style={styles.emoji}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          {isRateLoaded && !isChatActive && userBalance < chatRatePerMinute && (
            <View style={styles.balanceWarningBanner}>
              <Wallet size={16} color="#EF4444" />
              <Text style={styles.balanceWarningText}>
                Add balance to enable chat ({formatCurrency(chatRatePerMinute)}/min)
              </Text>
              <TouchableOpacity 
                style={styles.topUpButton}
                onPress={() => router.push('/wallet')}
              >
                <Plus size={14} color="#FFFFFF" />
                <Text style={styles.topUpButtonText}>Add Balance</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.iconButton}
            onPress={pickImage}
            disabled={isSending || !isRateLoaded || !isChatActive}
          >
            <ImagePlus size={20} color={!isRateLoaded || !isChatActive ? "#D1D5DB" : "#2563EB"} />
          </TouchableOpacity>
          
          <TextInput
            style={[styles.input, (!isRateLoaded || !isChatActive) && styles.disabledInput]}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder={!isRateLoaded || !isChatActive ? "Add balance to chat" : "Type a message..."}
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
            autoCapitalize="sentences"
            autoCorrect={true}
            returnKeyType="default"
            blurOnSubmit={false}
            editable={!isSending && isRateLoaded && isChatActive}
          />
          
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={isSending || !isRateLoaded || !isChatActive}
          >
            <Smile size={20} color={!isRateLoaded || !isChatActive ? "#D1D5DB" : "#2563EB"} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.sendButton, (isSending || (!newMessage.trim() && !selectedImage) || !isRateLoaded || !isChatActive) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={isSending || (!newMessage.trim() && !selectedImage) || !isRateLoaded || !isChatActive}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageViewerModal(false)}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity
            style={styles.imageViewerBackdrop}
            activeOpacity={1}
            onPress={() => setImageViewerModal(false)}
          />
          
          <View style={styles.imageViewerContent}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.imageViewerCloseButton}
              onPress={() => setImageViewerModal(false)}
            >
              <X size={28} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Image */}
            {viewingImageUrl && (
              <Image
                source={{ uri: viewingImageUrl }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}

            {/* Download Button */}
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => {
                if (viewingImageUrl) {
                  downloadImage(viewingImageUrl);
                }
              }}
            >
              <Text style={styles.downloadButtonText}>⬇ Download Image</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Balance Check Modal */}
      <Modal
        visible={showBalanceModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBalanceModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.balanceModalContent}>
            <View style={styles.balanceModalHeader}>
              <Wallet size={32} color="#EF4444" />
              <Text style={styles.balanceModalTitle}>Insufficient Balance</Text>
            </View>

            <View style={styles.balanceModalBody}>
              <Text style={styles.balanceModalLabel}>Current Balance:</Text>
              <Text style={styles.balanceModalAmount}>{formatCurrency(userBalance)}</Text>

              <Text style={[styles.balanceModalLabel, { marginTop: 16 }]}>Required Amount:</Text>
              <Text style={styles.balanceModalAmount}>{formatCurrency(chatRatePerMinute)}/min</Text>

              <View style={styles.balanceModalShortfall}>
                <Text style={styles.shortfallLabel}>Shortfall:</Text>
                <Text style={styles.shortfallAmount}>
                  {formatCurrency(Math.max(0, chatRatePerMinute - userBalance))}
                </Text>
              </View>
            </View>

            <View style={styles.balanceModalFooter}>
              <TouchableOpacity
                style={styles.balanceModalButtonCancel}
                onPress={() => {
                  // Close modal but keep chat/calls disabled until balance is added
                  setShowBalanceModal(false);
                  console.log('[Chat] User closed modal - chat/calls still disabled due to insufficient balance');
                }}
              >
                <Text style={styles.balanceModalButtonText}>Not Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.balanceModalButtonAdd}
                onPress={() => {
                  setShowBalanceModal(false);
                  router.push('/wallet');
                }}
              >
                <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.balanceModalButtonAddText}>Add Balance</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  videoCallButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  moreButton: {
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
    minHeight: '100%',
  },
  emptyState: {
    minHeight: 300,
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
  imageWrapper: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  messageImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  imagePreviewContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  imagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiPickerContainer: {
    maxHeight: '40%',
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  emojiPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  emojiPickerTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  emojiGridContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  emojiButton: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    marginVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  emoji: {
    fontSize: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  imageViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '70%',
    borderRadius: 8,
  },
  downloadButton: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-Bold',
  },
  balanceWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: 6,
    gap: 8,
  },
  balanceWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '500',
    fontFamily: 'Inter-Regular',
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    gap: 4,
  },
  topUpButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter-Bold',
  },
  disabledInput: {
    backgroundColor: '#E5E7EB',
    color: '#9CA3AF',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  balanceModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
    fontFamily: 'Inter-Bold',
  },
  balanceModalBody: {
    marginBottom: 20,
  },
  balanceModalLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'Inter-Regular',
  },
  balanceModalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 16,
    fontFamily: 'Inter-Bold',
  },
  balanceModalShortfall: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  shortfallLabel: {
    fontSize: 12,
    color: '#7F1D1D',
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'Inter-Regular',
  },
  shortfallAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
    fontFamily: 'Inter-Bold',
  },
  balanceModalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  balanceModalButtonCancel: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  balanceModalButtonAdd: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  balanceModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Inter-Bold',
  },
  balanceModalButtonAddText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
});
