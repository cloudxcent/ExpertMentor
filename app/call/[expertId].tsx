import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Image, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, ArrowLeft, Clock, DollarSign, RotateCw } from 'lucide-react-native';
import { Audio, Video as ExpoVideo } from 'expo-av';
import { voipService, AGORA_APP_ID } from '../../utils/voipService';
import { callSignaling, CallSession, CallStatus } from '../../utils/callSignaling';
import { auth } from '../../config/firebase';

const { width, height } = Dimensions.get('window');

interface CallState {
  isConnected: boolean;
  duration: number;
  isMuted: boolean;
  isVideoEnabled: boolean;
  callType: 'audio' | 'video';
  isInitializing: boolean;
  remoteUserJoined: boolean;
  channelName: string;
}

export default function CallScreen() {
  const { expertId, expertName, expertImage, callType, callRate, isIncoming, sessionId } = useLocalSearchParams();
  const [callState, setCallState] = useState<CallState>({
    isConnected: false,
    duration: 0,
    isMuted: false,
    isVideoEnabled: callType === 'video',
    callType: callType as 'audio' | 'video',
    isInitializing: true,
    remoteUserJoined: false,
    channelName: '',
  });
  const [callCost, setCallCost] = useState(0);
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const currentUserIdRef = useRef<string | null>(null);
  const currentUserNameRef = useRef<string | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStatusUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    initializeCall();
    return () => {
      cleanupCall();
    };
  }, []);

  useEffect(() => {
    // Only start duration timer when call status is 'accepted' (both sides have responded)
    if (callSession?.status === 'accepted') {
      console.log('[CallScreen] Starting duration timer - call accepted by both parties');
      durationIntervalRef.current = setInterval(() => {
        setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
        const minutes = Math.ceil((callState.duration + 1) / 60);
        setCallCost(minutes * parseFloat(callRate as string || '0'));
      }, 1000);
    } else {
      // Stop timer if call is not in accepted state (waiting for response)
      if (durationIntervalRef.current) {
        console.log('[CallScreen] Stopping duration timer - call not yet accepted');
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [callSession?.status, callState.duration]);

  const initializeCall = async () => {
    try {
      // Get current user info
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user found');
      }

      currentUserIdRef.current = user.uid;
      
      // Get actual user name from Firebase Auth
      let userName = user.displayName || 'User';
      console.log('[CallScreen] Using user name:', userName);
      
      currentUserNameRef.current = userName;

      console.log(`[CallScreen] Initializing call for user: ${user.uid}, Name: ${userName}`);
      console.log(`[CallScreen] Is incoming call: ${isIncoming}`);

      // Request audio permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone access is needed for calls');
        router.back();
        return;
      }

      // Configure audio session for call
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: true, // Use earpiece for better audio in calls
      });

      // Initialize Agora engine
      console.log('[CallScreen] Initializing Agora engine...');
      const initialized = await voipService.initialize(AGORA_APP_ID);
      if (!initialized) {
        throw new Error('Failed to initialize Agora engine');
      }

      // Set up event listeners for Agora
      setupAgoraEventListeners();

      let sessionIdToUse: string;
      const isIncomingCall = isIncoming === 'true';

      if (isIncomingCall && sessionId) {
        // Incoming call - use the existing session ID
        sessionIdToUse = Array.isArray(sessionId) ? sessionId[0] : sessionId;
        console.log(`[CallScreen] Using existing session ID for incoming call: ${sessionIdToUse}`);
        
        // Get the call session details
        const sessionResult = await callSignaling.getCallSession(sessionIdToUse);
        if (sessionResult.success && sessionResult.data) {
          setCallSession(sessionResult.data);
        }
      } else {
        // Outgoing call - create new session
        console.log('[CallScreen] Creating new call session for outgoing call...');
        const expert = Array.isArray(expertId) ? expertId[0] : expertId;
        
        const result = await callSignaling.createCallSession(
          user.uid,
          currentUserNameRef.current,
          expert as string,
          Array.isArray(expertName) ? expertName[0] : expertName,
          callState.callType,
          undefined,
          Array.isArray(expertImage) ? expertImage[0] : expertImage,
          parseFloat(callRate as string || '0')
        );

        if (!result.success || !result.sessionId) {
          throw new Error('Failed to create call session');
        }

        sessionIdToUse = result.sessionId;
        console.log(`[CallScreen] Call session created: ${sessionIdToUse}`);
      }

      setCallState(prev => ({ 
        ...prev, 
        channelName: sessionIdToUse,
        isInitializing: false 
      }));

      // Listen for call status changes
      const unsubscribe = callSignaling.listenForCallStatus(
        sessionIdToUse,
        (call) => {
          console.log(`[CallScreen] Call status changed: ${call.status}`);
          setCallSession(call);
          handleCallStatusChange(call);
        },
        (error) => {
          setErrorMessage('Connection lost');
          console.error('[CallScreen] Error listening to call status:', error);
        }
      );

      callStatusUnsubscribeRef.current = unsubscribe || null;

      // Update status based on incoming/outgoing
      if (isIncomingCall) {
        // Already accepted in the incoming call screen, now just join the channel
        console.log('[CallScreen] Joining channel as incoming call acceptor');
      } else {
        // Outgoing call - update status to ringing
        console.log('[CallScreen] Updating status to ringing for outgoing call');
        await callSignaling.updateCallStatus(sessionIdToUse, 'ringing');
      }

      // Join the Agora channel
      console.log('[CallScreen] Joining Agora channel...');
      const joinSuccess = await voipService.joinChannel({
        appId: AGORA_APP_ID,
        channelName: sessionIdToUse,
        uid: parseInt(user.uid.slice(0, 8), 16) % 0xffffffff, // Convert UID to number
      });

      if (joinSuccess) {
        setCallState(prev => ({ ...prev, isConnected: true }));
        console.log('[CallScreen] Successfully joined Agora channel');
        
        // DO NOT auto-accept the call here
        // Wait for the listener to get the status from Firestore
        // For outgoing calls: other user must accept
        // For incoming calls: status should already be 'accepted' from incoming-call screen
        console.log('[CallScreen] Waiting for call status updates from listener...');
      } else {
        throw new Error('Failed to join call channel');
      }
    } catch (error: any) {
      console.error('[CallScreen] Error initializing call:', error);
      setErrorMessage(error.message || 'Failed to initialize call');
      setCallState(prev => ({ ...prev, isInitializing: false }));
      
      Alert.alert('Error', error.message || 'Failed to initialize call', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  };

  const setupAgoraEventListeners = () => {
    voipService.registerEventListeners({
      onUserJoined: (uid) => {
        console.log(`[CallScreen] Remote user joined: ${uid}`);
        setCallState(prev => ({ ...prev, remoteUserJoined: true }));
      },
      onUserOffline: (uid) => {
        console.log(`[CallScreen] Remote user offline: ${uid}`);
        setCallState(prev => ({ ...prev, remoteUserJoined: false }));
      },
      onJoinChannelSuccess: (channel, uid, elapsed) => {
        console.log(`[CallScreen] Successfully joined channel ${channel} with UID ${uid}`);
      },
      onError: (error) => {
        console.error('[CallScreen] Agora error:', error);
        setErrorMessage('Call connection error');
      },
    });
  };

  const handleCallStatusChange = (call: CallSession) => {
    console.log(`[CallScreen] Call status changed to: ${call.status}`);
    
    switch (call.status) {
      case 'accepted':
        console.log('[CallScreen] Call accepted by remote user');
        // Update local call session to reflect accepted status
        setCallSession(call);
        // Reset duration and cost to start fresh from 0 when call is accepted
        setCallState(prev => ({ ...prev, duration: 0 }));
        setCallCost(0);
        break;
      case 'rejected':
        console.log('[CallScreen] Call rejected by remote user');
        // Cleanup listeners and timer
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
        if (callStatusUnsubscribeRef.current) {
          callStatusUnsubscribeRef.current();
          callStatusUnsubscribeRef.current = null;
        }
        Alert.alert('Call Rejected', 'The expert declined your call', [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]);
        break;
      case 'missed':
        console.log('[CallScreen] Call missed');
        // Cleanup listeners and timer
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
        if (callStatusUnsubscribeRef.current) {
          callStatusUnsubscribeRef.current();
          callStatusUnsubscribeRef.current = null;
        }
        Alert.alert('Missed Call', 'The expert did not respond', [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]);
        break;
      case 'ended':
        console.log('[CallScreen] Call ended by remote user');
        // Update local call session
        setCallSession(call);
        // Cleanup listeners and timer immediately
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
        if (callStatusUnsubscribeRef.current) {
          console.log('[CallScreen] Unsubscribing from call status listener for ended call');
          callStatusUnsubscribeRef.current();
          callStatusUnsubscribeRef.current = null;
        }
        // Navigate back after a short delay to ensure UI updates
        setTimeout(() => {
          console.log('[CallScreen] Navigating back after call ended');
          router.back();
        }, 300);
        break;
      case 'cancelled':
        console.log('[CallScreen] Call cancelled by remote user');
        // Update local call session
        setCallSession(call);
        // Stop the timer and cleanup listeners
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
        if (callStatusUnsubscribeRef.current) {
          console.log('[CallScreen] Unsubscribing from call status listener before back');
          callStatusUnsubscribeRef.current();
          callStatusUnsubscribeRef.current = null;
        }
        // Show alert and navigate back
        Alert.alert('Call Cancelled', 'The call was cancelled', [
          {
            text: 'OK',
            onPress: () => {
              console.log('[CallScreen] Navigating back after cancel alert');
              router.back();
            }
          }
        ]);
        break;
    }
  };

  const cleanupCall = async () => {
    try {
      // Unsubscribe from call status listener
      if (callStatusUnsubscribeRef.current) {
        callStatusUnsubscribeRef.current();
      }

      // Stop duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }

      // Leave channel and cleanup Agora
      if (voipService.isReady()) {
        // End the call session if it exists
        if (callState.channelName) {
          await callSignaling.endCall(
            callState.channelName,
            callState.duration,
            callCost
          );
        }

        await voipService.leaveChannel();
      }

      // Cleanup audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });

      console.log('[CallScreen] Call cleanup completed');
    } catch (error) {
      console.error('[CallScreen] Error during cleanup:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    try {
      console.log('[CallScreen] Ending call...');
      console.log('[CallScreen] Current call session:', callSession?.id, 'Status:', callSession?.status);
      console.log('[CallScreen] Call state connected:', callState.isConnected);
      
      // Determine the right status based on call state
      let statusToUpdate = 'ended';
      if (!callState.isConnected && callSession?.status === 'calling') {
        statusToUpdate = 'cancelled';
      } else if (!callState.isConnected && callSession?.status === 'ringing') {
        statusToUpdate = 'cancelled';
      }
      
      console.log('[CallScreen] Updating call status to:', statusToUpdate);
      
      // First update the call session status
      if (callSession?.id) {
        if (statusToUpdate === 'cancelled') {
          const result = await callSignaling.cancelCall(callSession.id);
          console.log('[CallScreen] Cancel call result:', result);
        } else {
          const result = await callSignaling.endCall(
            callSession.id,
            callState.duration,
            callCost
          );
          console.log('[CallScreen] End call result:', result);
        }
      } else {
        console.warn('[CallScreen] No call session ID available');
      }
      
      // Clean up Agora and audio
      if (voipService.isReady()) {
        console.log('[CallScreen] Leaving Agora channel and destroying service');
        await voipService.leaveChannel();
        await voipService.destroy();
      }
      
      // Stop duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      
      // Unsubscribe from call status listener
      if (callStatusUnsubscribeRef.current) {
        console.log('[CallScreen] Unsubscribing from call status listener');
        callStatusUnsubscribeRef.current();
        callStatusUnsubscribeRef.current = null;
      }
      
      console.log('[CallScreen] Call ended successfully with status:', statusToUpdate);
      
      // Navigate back
      router.back();
    } catch (error) {
      console.error('[CallScreen] Error ending call:', error);
      Alert.alert('Error', 'Failed to end call properly');
      router.back();
    }
  };

  const toggleMute = async () => {
    try {
      const newMutedState = !callState.isMuted;
      const success = await voipService.enableAudio(!newMutedState);
      if (success) {
        setCallState(prev => ({ ...prev, isMuted: newMutedState }));
      }
    } catch (error) {
      console.error('[CallScreen] Error toggling mute:', error);
    }
  };

  const toggleVideo = async () => {
    try {
      const newVideoState = !callState.isVideoEnabled;
      const success = await voipService.enableVideo(newVideoState);
      if (success) {
        setCallState(prev => ({ ...prev, isVideoEnabled: newVideoState }));
      }
    } catch (error) {
      console.error('[CallScreen] Error toggling video:', error);
    }
  };

  const switchCamera = async () => {
    try {
      const success = await voipService.switchCamera();
      if (!success) {
        Alert.alert('Error', 'Failed to switch camera');
      }
    } catch (error) {
      console.error('[CallScreen] Error switching camera:', error);
    }
  };

  if (callState.isInitializing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Initializing call...</Text>
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.callStatus}>
          {callSession?.status === 'accepted' 
            ? 'On Call' 
            : callSession?.status === 'calling' || callSession?.status === 'ringing'
              ? 'Calling...' 
              : 'Connecting...'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.expertInfo}>
          <Image 
            source={{ 
              uri: Array.isArray(expertImage) ? expertImage[0] : (expertImage as string || 'https://images.pexels.com/photos/3778603/pexels-photo-3778603.jpeg?auto=compress&cs=tinysrgb&w=400')
            }} 
            style={styles.expertAvatar} 
          />
          <Text style={styles.expertName}>
            {Array.isArray(expertName) ? expertName[0] : expertName}
          </Text>
          <Text style={styles.callType}>
            {callState.callType === 'video' ? 'Video Call' : 'Voice Call'}
          </Text>
          
          {callState.isConnected && (
            <View style={styles.durationContainer}>
              <Text style={styles.duration}>
                {callSession?.status === 'accepted' 
                  ? formatDuration(callState.duration)
                  : '00:00'}
              </Text>
              <Text style={styles.durationLabel}>Call Duration</Text>
              <View style={styles.costContainer}>
                <DollarSign size={16} color="#F59E0B" />
                <Text style={styles.costText}>₹{callCost.toFixed(2)}</Text>
              </View>
            </View>
          )}

          {callState.remoteUserJoined && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>📞 Connected</Text>
            </View>
          )}
        </View>

        {callState.callType === 'video' && callState.isVideoEnabled && (
          <View style={styles.videoContainer}>
            <View style={styles.videoPlaceholder}>
              {callState.remoteUserJoined ? (
                <View>
                  <Text style={styles.videoPlaceholderText}>Live video stream</Text>
                  <Text style={styles.videoSubText}>Remote video will appear here</Text>
                </View>
              ) : (
                <View>
                  <Video size={48} color="#FFFFFF" />
                  <Text style={styles.videoPlaceholderText}>Waiting for video...</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.controlButton, callState.isMuted && styles.controlButtonActive]}
          onPress={toggleMute}
        >
          {callState.isMuted ? (
            <MicOff size={24} color="#FFFFFF" />
          ) : (
            <Mic size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>

        {callState.callType === 'video' && (
          <>
            <TouchableOpacity 
              style={[styles.controlButton, !callState.isVideoEnabled && styles.controlButtonActive]}
              onPress={toggleVideo}
            >
              {callState.isVideoEnabled ? (
                <Video size={24} color="#FFFFFF" />
              ) : (
                <VideoOff size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlButton}
              onPress={switchCamera}
            >
              <RotateCw size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
          <PhoneOff size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callStatus: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  expertInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  expertAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  expertName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  callType: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#D1D5DB',
    marginBottom: 16,
  },
  durationContainer: {
    alignItems: 'center',
  },
  duration: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  durationLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#D1D5DB',
    marginTop: 4,
  },
  costContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  costText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#F59E0B',
  },
  statusBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#22C55E',
  },
  videoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 32,
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholderText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginTop: 8,
  },
  videoSubText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#D1D5DB',
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 16,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#EF4444',
  },
  endCallButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
    marginTop: 8,
  },
});