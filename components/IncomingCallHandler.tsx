import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Vibration,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Phone, PhoneOff, Video, Mic } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { router } from 'expo-router';
import { callSignaling, CallSession } from '../utils/callSignaling';

const { width, height } = Dimensions.get('window');

interface IncomingCallHandlerProps {
  isVisible: boolean;
  call: CallSession | null;
  onAccept?: () => void;
  onReject?: () => void;
}

export default function IncomingCallHandler({
  isVisible,
  call,
  onAccept,
  onReject,
}: IncomingCallHandlerProps) {
  const [callState, setCallState] = useState<'ringing' | 'accepted' | 'rejected'>('ringing');
  const [elapsedTime, setElapsedTime] = useState(0);
  const soundObjectRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRejectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isVisible && call) {
      playRingtone();
      startTimer();
      vibratePhone();
      // Auto-reject after 60 seconds
      autoRejectTimerRef.current = setTimeout(() => {
        handleRejectCall();
      }, 60000);
    }

    return () => {
      stopRingtone();
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoRejectTimerRef.current) clearTimeout(autoRejectTimerRef.current);
    };
  }, [isVisible, call?.id]);

  const playRingtone = async () => {
    try {
      // Configure audio for ringtone
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
      });

      // You can use a system sound or a custom audio file
      // For now, we'll play a beep pattern
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/ringtone.mp3') // Add your ringtone file
      );

      soundObjectRef.current = sound;
      await sound.playAsync();

      // Loop the ringtone
      await sound.setIsLoopingAsync(true);
    } catch (error) {
      console.error('[IncomingCallHandler] Error playing ringtone:', error);
    }
  };

  const stopRingtone = async () => {
    try {
      if (soundObjectRef.current) {
        await soundObjectRef.current.stopAsync();
        await soundObjectRef.current.unloadAsync();
        soundObjectRef.current = null;
      }
    } catch (error) {
      console.error('[IncomingCallHandler] Error stopping ringtone:', error);
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };

  const vibratePhone = () => {
    try {
      // Vibrate pattern: 100ms on, 100ms off, repeated
      const pattern = [0, 200, 200, 200];
      Vibration.vibrate(pattern);
    } catch (error) {
      console.error('[IncomingCallHandler] Error vibrating:', error);
    }
  };

  const handleAcceptCall = async () => {
    try {
      if (!call) return;

      console.log('[IncomingCallHandler] Accepting call...');
      setCallState('accepted');

      // Stop ringtone
      await stopRingtone();
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoRejectTimerRef.current) clearTimeout(autoRejectTimerRef.current);

      // Update call status in Firestore
      await callSignaling.acceptCall(call.id);

      // Callback to parent component
      onAccept?.();

      // Navigate to call screen
      setTimeout(() => {
        router.push({
          pathname: '/call/[expertId]',
          params: {
            expertId: call.callerId,
            expertName: call.callerName,
            expertImage: call.callerImage,
            callType: call.callType,
            callRate: call.callRate?.toString() || '0',
            isIncoming: 'true',
            sessionId: call.id,
          },
        });
      }, 500);
    } catch (error) {
      console.error('[IncomingCallHandler] Error accepting call:', error);
      Alert.alert('Error', 'Failed to accept call');
    }
  };

  const handleRejectCall = async () => {
    try {
      if (!call) return;

      console.log('[IncomingCallHandler] Rejecting call...');
      setCallState('rejected');

      // Stop ringtone
      await stopRingtone();
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoRejectTimerRef.current) clearTimeout(autoRejectTimerRef.current);

      // Update call status in Firestore
      await callSignaling.rejectCall(call.id);

      // Callback to parent component
      onReject?.();
    } catch (error) {
      console.error('[IncomingCallHandler] Error rejecting call:', error);
      Alert.alert('Error', 'Failed to reject call');
    }
  };

  if (!isVisible || !call || callState !== 'ringing') {
    return null;
  }

  const formatCallTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Caller Info */}
        <View style={styles.callerSection}>
          <Image
            source={{
              uri: call.callerImage || 'https://images.pexels.com/photos/3778603/pexels-photo-3778603.jpeg?auto=compress&cs=tinysrgb&w=400',
            }}
            style={styles.callerAvatar}
          />
          <Text style={styles.callerName}>{call.callerName}</Text>
          <Text style={styles.callTypeText}>
            {call.callType === 'video' ? '📹 Video Call' : '📞 Voice Call'}
          </Text>
          <Text style={styles.callDuration}>{formatCallTime(elapsedTime)}</Text>
        </View>

        {/* Call Info */}
        <View style={styles.callInfoSection}>
          {call.callRate && (
            <View style={styles.rateInfo}>
              <Text style={styles.rateLabel}>Rate: ₹{call.callRate}/min</Text>
            </View>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {/* Reject Button */}
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={handleRejectCall}
          activeOpacity={0.7}
        >
          <PhoneOff size={32} color="#FFFFFF" />
          <Text style={styles.buttonText}>Decline</Text>
        </TouchableOpacity>

        {/* Accept Button */}
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={handleAcceptCall}
          activeOpacity={0.7}
        >
          <Phone size={32} color="#FFFFFF" />
          <Text style={styles.buttonText}>Accept</Text>
        </TouchableOpacity>
      </View>

      {/* Optional: Show call type indicators */}
      <View style={styles.callTypeIndicators}>
        {call.callType === 'video' && (
          <View style={styles.indicator}>
            <Video size={20} color="#3B82F6" />
            <Text style={styles.indicatorText}>Video Available</Text>
          </View>
        )}
        {call.callType === 'audio' && (
          <View style={styles.indicator}>
            <Mic size={20} color="#10B981" />
            <Text style={styles.indicatorText}>Audio Call</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
    justifyContent: 'space-between',
    paddingBottom: 0,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  callerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  callerAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 24,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  callerName: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  callTypeText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#D1D5DB',
    marginBottom: 16,
  },
  callDuration: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  callInfoSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  rateInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  rateLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  rejectButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  acceptButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  callTypeIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    gap: 6,
  },
  indicatorText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#D1D5DB',
  },
});
