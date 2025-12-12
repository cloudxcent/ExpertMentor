import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Image, Dimensions, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Phone, PhoneOff, AlertCircle } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { callSignaling, CallSession } from '../utils/callSignaling';
import { auth } from '../config/firebase';

const { width, height } = Dimensions.get('window');

export default function IncomingCallScreen() {
  const { callId, callerId, callerName, callerImage, callType } = useLocalSearchParams();
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const ringtoneSoundRef = useRef<any>(null);
  const statusUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    initializeIncomingCall();
    
    return () => {
      stopRingtone();
      if (statusUnsubscribeRef.current) {
        statusUnsubscribeRef.current();
      }
    };
  }, []);

  const initializeIncomingCall = async () => {
    try {
      // Get the call session details
      const sessionId = Array.isArray(callId) ? callId[0] : callId;
      const result = await callSignaling.getCallSession(sessionId);

      if (result.success && result.data) {
        setCallSession(result.data);
        console.log('[IncomingCall] Call session loaded:', result.data);

        // Play ringtone
        await playRingtone();

        // Listen for call status changes
        const unsubscribe = callSignaling.listenForCallStatus(
          sessionId,
          (call) => {
            console.log('[IncomingCall] Call status changed:', call.status);
            setCallSession(call);

            // If caller cancelled before we answer, show alert and go back
            if (call.status === 'cancelled') {
              Alert.alert('Call Cancelled', 'The caller ended the call', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            }
          }
        );

        statusUnsubscribeRef.current = unsubscribe;
      } else {
        Alert.alert('Error', 'Failed to load call details', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      console.error('[IncomingCall] Error initializing:', error);
      Alert.alert('Error', 'Failed to initialize incoming call', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const playRingtone = async () => {
    try {
      // Set audio mode for receiving calls
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      // Create a simple beep sound using Audio recording
      console.log('[IncomingCall] Playing ringtone');
      // In a real app, you'd load an actual ringtone file
      // For now, we'll just show the incoming call screen
    } catch (error) {
      console.error('[IncomingCall] Error playing ringtone:', error);
    }
  };

  const stopRingtone = async () => {
    try {
      if (ringtoneSoundRef.current) {
        await ringtoneSoundRef.current.unloadAsync();
      }
    } catch (error) {
      console.error('[IncomingCall] Error stopping ringtone:', error);
    }
  };

  const handleAcceptCall = async () => {
    try {
      const sessionId = Array.isArray(callId) ? callId[0] : callId;
      
      // Stop ringtone
      await stopRingtone();

      // Update call status to accepted
      const result = await callSignaling.acceptCall(sessionId);
      if (result.success) {
        console.log('[IncomingCall] Call accepted');
        
        // Request audio permissions
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Microphone access is needed for calls');
          return;
        }

        // Navigate to the call screen
        router.push({
          pathname: '/call/[expertId]',
          params: {
            expertId: Array.isArray(callerId) ? callerId[0] : callerId,
            expertName: callerName,
            expertImage: callerImage,
            callType: callType || 'audio',
            isIncoming: 'true',
            sessionId: sessionId,
            callRate: callSession?.callRate?.toString() || '0'
          }
        });
      } else {
        Alert.alert('Error', 'Failed to accept call');
      }
    } catch (error) {
      console.error('[IncomingCall] Error accepting call:', error);
      Alert.alert('Error', 'Failed to accept call');
    }
  };

  const handleRejectCall = async () => {
    try {
      const sessionId = Array.isArray(callId) ? callId[0] : callId;
      
      // Stop ringtone
      await stopRingtone();

      // Update call status to rejected
      const result = await callSignaling.rejectCall(sessionId);
      if (result.success) {
        console.log('[IncomingCall] Call rejected');
        router.back();
      } else {
        Alert.alert('Error', 'Failed to reject call');
      }
    } catch (error) {
      console.error('[IncomingCall] Error rejecting call:', error);
      Alert.alert('Error', 'Failed to reject call');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <AlertCircle size={48} color="#2563EB" />
          <Text style={styles.loadingText}>Loading call...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Caller Info */}
        <View style={styles.callerInfoSection}>
          <Image
            source={{
              uri: Array.isArray(callerImage)
                ? callerImage[0]
                : callerImage || 'https://images.pexels.com/photos/3778603/pexels-photo-3778603.jpeg?auto=compress&cs=tinysrgb&w=400'
            }}
            style={styles.callerImage}
          />
          <Text style={styles.callerName}>
            {Array.isArray(callerName) ? callerName[0] : (callerName || 'Unknown Caller')}
          </Text>
          <Text style={styles.callType}>
            {callType === 'video' ? 'Video Call' : 'Voice Call'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Reject Button */}
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={handleRejectCall}
          >
            <PhoneOff size={32} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Accept Button */}
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={handleAcceptCall}
          >
            <Phone size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  callerInfoSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  callerImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 24,
    borderWidth: 4,
    borderColor: '#3B82F6',
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  callType: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 60,
    width: '100%',
  },
  rejectButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
