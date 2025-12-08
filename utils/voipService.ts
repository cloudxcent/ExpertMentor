import { Audio } from 'expo-av';

// Agora configuration from environment
export const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';
export const AGORA_TEMP_TOKEN = process.env.EXPO_PUBLIC_AGORA_TEMP_TOKEN || '';

interface VoIPConfig {
  appId: string;
  token?: string;
  channelName: string;
  uid: number;
}

interface CallStats {
  duration: number;
  audioLevel: number;
  videoResolution: string;
  bitrate: number;
}

/**
 * VoIPService handles Agora RTC Engine operations
 * 
 * IMPORTANT: This is currently a MOCK implementation
 * For real voice calling, you need to:
 * 1. Install react-native-agora SDK
 * 2. Integrate native Agora RTC Engine
 * 3. Use AGORA_APP_ID and AGORA_TEMP_TOKEN from environment
 * 
 * See AGORA_SETUP_GUIDE.md for complete setup instructions
 */
class VoIPService {
  private isInitialized: boolean = false;
  private currentChannel: string | null = null;
  private localUid: number = 0;
  private eventListeners: Map<string, Function[]> = new Map();
  private callStats: CallStats = {
    duration: 0,
    audioLevel: 0,
    videoResolution: '0x0',
    bitrate: 0,
  };

  constructor() {
    console.log('[VoIP] VoIPService initialized (MOCK MODE - Real Agora SDK needed for voice)');
    console.log('[VoIP] App ID:', AGORA_APP_ID ? '✓ Configured' : '✗ Missing');
    console.log('[VoIP] Token:', AGORA_TEMP_TOKEN ? '✓ Configured' : '✗ Missing');
  }

  /**
   * Initialize the VoIP Service
   */
  async initialize(appId: string): Promise<boolean> {
    try {
      console.log('[VoIP] Initializing VoIP Service...');
      console.log('[VoIP] Using App ID:', AGORA_APP_ID || appId);
      
      if (!AGORA_APP_ID && !appId) {
        console.error('[VoIP] ✗ No Agora App ID configured');
        console.error('[VoIP] Add EXPO_PUBLIC_AGORA_APP_ID to .env.local');
        return false;
      }

      if (!AGORA_TEMP_TOKEN) {
        console.warn('[VoIP] ⚠ No temporary token configured');
        console.warn('[VoIP] Add EXPO_PUBLIC_AGORA_TEMP_TOKEN to .env.local');
      }
      
      // Request audio permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.error('[VoIP] ✗ Audio permission not granted');
        return false;
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      this.isInitialized = true;
      console.log('[VoIP] ✓ VoIP Service initialized successfully');
      return true;
    } catch (error) {
      console.error('[VoIP] ✗ Failed to initialize VoIP service:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Join a call channel
   */
  async joinChannel(config: VoIPConfig): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        console.error('[VoIP] Service not initialized');
        return false;
      }

      console.log(`[VoIP] Joining channel: ${config.channelName}`);

      this.currentChannel = config.channelName;
      this.localUid = config.uid;

      // Simulate channel join
      this.emit('JoinChannelSuccess', {
        channel: config.channelName,
        uid: config.uid,
        elapsed: 0,
      });

      console.log('[VoIP] ✓ Successfully joined channel');
      return true;
    } catch (error) {
      console.error('[VoIP] ✗ Failed to join channel:', error);
      return false;
    }
  }

  /**
   * Leave the current channel
   */
  async leaveChannel(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      console.log('[VoIP] Leaving channel...');
      
      this.emit('LeaveChannel', {});
      this.currentChannel = null;
      
      console.log('[VoIP] ✓ Successfully left channel');
      return true;
    } catch (error) {
      console.error('[VoIP] ✗ Failed to leave channel:', error);
      return false;
    }
  }

  /**
   * Enable/Disable local audio
   */
  async enableAudio(enabled: boolean): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      if (enabled) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        console.log('[VoIP] Audio enabled');
      } else {
        console.log('[VoIP] Audio disabled (muted)');
      }
      return true;
    } catch (error) {
      console.error('[VoIP] Failed to toggle audio:', error);
      return false;
    }
  }

  /**
   * Enable/Disable local video
   */
  async enableVideo(enabled: boolean): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      if (enabled) {
        console.log('[VoIP] Video enabled');
      } else {
        console.log('[VoIP] Video disabled');
      }
      return true;
    } catch (error) {
      console.error('[VoIP] Failed to toggle video:', error);
      return false;
    }
  }

  /**
   * Switch camera between front and back
   */
  async switchCamera(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      console.log('[VoIP] Camera switched');
      return true;
    } catch (error) {
      console.error('[VoIP] Failed to switch camera:', error);
      return false;
    }
  }

  /**
   * Set video profile
   */
  async setVideoProfile(width: number, height: number, frameRate: number = 30): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      console.log(`[VoIP] Video profile set to ${width}x${height}@${frameRate}fps`);
      return true;
    } catch (error) {
      console.error('[VoIP] Failed to set video profile:', error);
      return false;
    }
  }

  /**
   * Enable/Disable speaker output
   */
  async enableSpeaker(enabled: boolean): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      console.log(`[VoIP] Speaker ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    } catch (error) {
      console.error('[VoIP] Failed to toggle speaker:', error);
      return false;
    }
  }

  /**
   * Register event listeners
   */
  registerEventListeners(callbacks: {
    onUserJoined?: (uid: number) => void;
    onUserOffline?: (uid: number) => void;
    onJoinChannelSuccess?: (channel: string, uid: number, elapsed: number) => void;
    onLeaveChannel?: () => void;
    onError?: (error: any) => void;
    onConnectionStateChanged?: (state: number, reason: number) => void;
  }): void {
    try {
      if (!this.isInitialized) {
        console.error('[VoIP] Service not initialized');
        return;
      }

      if (callbacks.onUserJoined) {
        this.on('UserJoined', (data: any) => {
          console.log(`[VoIP] Remote user joined: ${data.uid}`);
          callbacks.onUserJoined?.(data.uid);
        });
      }

      if (callbacks.onUserOffline) {
        this.on('UserOffline', (data: any) => {
          console.log(`[VoIP] Remote user offline: ${data.uid}`);
          callbacks.onUserOffline?.(data.uid);
        });
      }

      if (callbacks.onJoinChannelSuccess) {
        this.on('JoinChannelSuccess', (data: any) => {
          console.log(`[VoIP] Join channel success - ${data.channel}, UID: ${data.uid}`);
          callbacks.onJoinChannelSuccess?.(data.channel, data.uid, data.elapsed);
        });
      }

      if (callbacks.onLeaveChannel) {
        this.on('LeaveChannel', () => {
          console.log('[VoIP] Leave channel');
          callbacks.onLeaveChannel?.();
        });
      }

      if (callbacks.onError) {
        this.on('Error', (data: any) => {
          console.error('[VoIP] Engine error:', data);
          callbacks.onError?.(data);
        });
      }

      console.log('[VoIP] Event listeners registered');
    } catch (error) {
      console.error('[VoIP] Failed to register event listeners:', error);
    }
  }

  /**
   * Remove event listeners
   */
  removeEventListeners(): void {
    try {
      this.eventListeners.clear();
      console.log('[VoIP] Event listeners removed');
    } catch (error) {
      console.error('[VoIP] Failed to remove event listeners:', error);
    }
  }

  /**
   * Destroy the service
   */
  async destroy(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return true;
      }

      await this.leaveChannel();
      this.removeEventListeners();

      this.isInitialized = false;
      this.currentChannel = null;

      console.log('[VoIP] ✓ VoIP Service destroyed');
      return true;
    } catch (error) {
      console.error('[VoIP] Failed to destroy service:', error);
      return false;
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current channel name
   */
  getCurrentChannel(): string | null {
    return this.currentChannel;
  }

  /**
   * Update call statistics
   */
  updateCallStats(stats: Partial<CallStats>): void {
    this.callStats = { ...this.callStats, ...stats };
  }

  /**
   * Get call statistics
   */
  getCallStats(): CallStats {
    return { ...this.callStats };
  }

  /**
   * Simulate remote user joined
   */
  simulateUserJoined(uid: number): void {
    this.emit('UserJoined', { uid });
  }

  /**
   * Simulate remote user offline
   */
  simulateUserOffline(uid: number): void {
    this.emit('UserOffline', { uid });
  }

  /**
   * Internal event emitter
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => listener(data));
  }

  /**
   * Internal event listener
   */
  private on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }
}

// Export singleton instance
export const voipService = new VoIPService();
