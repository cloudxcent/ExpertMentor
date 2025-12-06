import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Image, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, ArrowLeft, Clock, DollarSign } from 'lucide-react-native';
import { Audio } from 'expo-av';

interface CallState {
  isConnected: boolean;
  duration: number;
  isMuted: boolean;
  isVideoEnabled: boolean;
  callType: 'audio' | 'video';
}

export default function CallScreen() {
  const { expertId, expertName, expertImage, callType, callRate } = useLocalSearchParams();
  const [callState, setCallState] = useState<CallState>({
    isConnected: false,
    duration: 0,
    isMuted: false,
    isVideoEnabled: callType === 'video',
    callType: callType as 'audio' | 'video'
  });
  const [callCost, setCallCost] = useState(0);

  useEffect(() => {
    initializeCall();
    return () => {
      cleanupCall();
    };
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (callState.isConnected) {
      interval = setInterval(() => {
        setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
        // Calculate cost based on duration and rate
        const minutes = Math.ceil((callState.duration + 1) / 60);
        setCallCost(minutes * parseFloat(callRate as string || '0'));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState.isConnected]);

  const initializeCall = async () => {
    try {
      // Request audio permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone access is needed for calls');
        router.back();
        return;
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Simulate call connection
      setTimeout(() => {
        setCallState(prev => ({ ...prev, isConnected: true }));
      }, 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to initialize call');
      router.back();
    }
  };

  const cleanupCall = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });
    } catch (error) {
      console.log('Error cleaning up audio:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    Alert.alert(
      'End Call',
      `End call? Total cost: ₹${callCost}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Call', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Call Ended',
              `Call duration: ${formatDuration(callState.duration)}\nTotal cost: ₹${callCost}`,
              [{ text: 'OK', onPress: () => router.back() }]
            );
          }
        }
      ]
    );
  };

  const toggleMute = () => {
    setCallState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  };

  const toggleVideo = () => {
    setCallState(prev => ({ ...prev, isVideoEnabled: !prev.isVideoEnabled }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.callStatus}>
          {callState.isConnected ? 'Connected' : 'Connecting...'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.expertInfo}>
          <Image 
            source={{ uri: expertImage as string || 'https://images.pexels.com/photos/3778603/pexels-photo-3778603.jpeg?auto=compress&cs=tinysrgb&w=400' }} 
            style={styles.expertAvatar} 
          />
          <Text style={styles.expertName}>{expertName}</Text>
          <Text style={styles.callType}>
            {callState.callType === 'video' ? 'Video Call' : 'Voice Call'}
          </Text>
          
          {callState.isConnected && (
            <View style={styles.durationContainer}>
              <Text style={styles.duration}>{formatDuration(callState.duration)}</Text>
              <Text style={styles.durationLabel}>Call Duration</Text>
              <View style={styles.costContainer}>
                <DollarSign size={16} color="#F59E0B" />
                <Text style={styles.costText}>₹{callCost}</Text>
              </View>
            </View>
          )}
        </View>

        {callState.callType === 'video' && callState.isVideoEnabled && (
          <View style={styles.videoContainer}>
            <View style={styles.videoPlaceholder}>
              <Video size={48} color="#FFFFFF" />
              <Text style={styles.videoPlaceholderText}>Video will appear here</Text>
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
    fontFamily: 'Inter-Regular',
    color: '#D1D5DB',
    marginTop: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 24,
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
});