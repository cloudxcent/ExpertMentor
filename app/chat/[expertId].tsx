import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, FlatList } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Phone, Camera, MoreVertical, Wallet, Plus, Smile, ImagePlus, X } from 'lucide-react-native';
import { db, auth } from '../../config/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, getDoc, doc, setDoc, getDocs, updateDoc } from 'firebase/firestore';
import { storage, StorageKeys } from '../../utils/storage';
import { ensureMediaUrl } from '../../utils/firebaseStorageUrl';
import { createMessageNotification } from '../../utils/notifications';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

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
            where('recipientId', '==', profileData.id),
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
      return;
    }

    // Reset scroll flag when setting up listener
    hasScrolledRef.current = false;

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
            isRead: data.isRead || false,
            imageUrl: data.imageUrl,
            mediaType: data.mediaType || 'text'
          });
        });

        setMessages(loadedMessages);
        console.log('[Chat] ✓ Messages state updated:', loadedMessages.length);

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
      console.log('[Chat] 🔌 Unsubscribing listener');
      unsubscribe();
    };
  }, [sessionId, currentUserId]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        console.error('[Chat] Permission denied');
        alert('Permission to access media library is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        console.log('[Chat] Image selected:', imageUri);
        
        try {
          // Convert image to base64
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const reader = new FileReader();
          
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            const dataUri = `data:image/jpeg;base64,${base64}`;
            console.log('[Chat] Converted to base64, size:', dataUri.length);
            setSelectedImage(dataUri);
          };
          
          reader.onerror = () => {
            console.error('[Chat] FileReader error');
            setSelectedImage(imageUri);
          };
          
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error('[Chat] Error converting image:', error);
          setSelectedImage(imageUri);
        }
      }
    } catch (error) {
      console.error('[Chat] Error picking image:', error);
    }
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    // Keep emoji picker open
  };

  const handleSendMessage = async () => {
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
        mediaType: selectedImage ? 'image' : 'text'
      };

      // Store image as base64 data URI if selected
      if (selectedImage) {
        messageData.imageUrl = selectedImage;
      }

      const docRef = await addDoc(messagesRef, messageData);

      console.log('[Chat] ✓ Message saved:', docRef.id);

      await setDoc(sessionRef, { lastMessageAt: serverTimestamp() }, { merge: true });
      console.log('[Chat] ✓ Session updated');

      // Create notification for the recipient with unread count
      try {
        const recipientRef = doc(db, 'chat_sessions', sessionId, 'messages');
        const unreadQuery = query(
          recipientRef,
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
          const fileUri = `${FileSystem.documentDirectory}${fileName}`;
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          console.log('[Chat] Image saved to:', fileUri);
          alert(`Image saved to Downloads`);
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
          <TouchableOpacity style={styles.callButton} onPress={startVoiceCall}>
            <Phone size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.videoCallButton} onPress={startVideoCall}>
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
              return (
                <View
                  key={message.id || index}
                  style={[
                    styles.messageBubble,
                    isSender ? styles.userMessage : styles.expertMessage
                  ]}
                >
                  {message.imageUrl && (
                    <TouchableOpacity 
                      style={styles.imageWrapper}
                      onPress={() => openImageViewer(message.imageUrl || '')}
                    >
                      <Image
                        source={{ uri: message.imageUrl }}
                        style={styles.messageImage}
                        resizeMode="cover"
                        onError={(e) => console.log('[Chat] Image load error:', e.nativeEvent.error)}
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
          <TouchableOpacity
            style={styles.iconButton}
            onPress={pickImage}
            disabled={isSending}
          >
            <ImagePlus size={20} color="#2563EB" />
          </TouchableOpacity>
          
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
            style={styles.iconButton}
            onPress={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={isSending}
          >
            <Smile size={20} color="#2563EB" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.sendButton, (isSending || (!newMessage.trim() && !selectedImage)) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={isSending || (!newMessage.trim() && !selectedImage)}
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
    resizeMode: 'cover',
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
    resizeMode: 'cover',
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
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
  }
});
