// THIS IS A REFERENCE IMPLEMENTATION FOR REAL AGORA SDK INTEGRATION
// Use this when you're ready to implement real voice calling

import RtcEngine, {
  RtcEngineContext,
  ChannelProfile,
  ClientRole,
  AudioSampleRateType,
} from 'react-native-agora';
import { Audio } from 'expo-av';

// Use credentials from environment directly (don't import from voipService to avoid conflicts)
const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';
const AGORA_TEMP_TOKEN = process.env.EXPO_PUBLIC_AGORA_TEMP_TOKEN || '';

/**
 * REAL AGORA IMPLEMENTATION - Ready to use when SDK is installed
 * 
 * Installation:
 * npm install react-native-agora
 * npx expo prebuild
 * npm run build:android  (or build:ios)
 */

interface VoIPConfig {
  appId: string;
  token?: string;
  channelName: string;
  uid: number;
}

class RealAgoraVoIPService {
  private rtcEngine: RtcEngine | null = null;
  private channelName: string = '';
  private eventListeners: Map<string, Function[]> = new Map();

  /**
   * Initialize Real Agora RTC Engine
   */
  async initialize(appId: string): Promise<boolean> {
    try {
      console.log('[AgoraReal] Initializing real Agora RTC Engine...');
      console.log('[AgoraReal] App ID:', appId || AGORA_APP_ID);

      // Create engine instance
      this.rtcEngine = await RtcEngine.create(appId || AGORA_APP_ID);

      if (!this.rtcEngine) {
        throw new Error('Failed to create Agora RTC Engine');
      }

      // Enable audio
      await this.rtcEngine.enableAudio();

      // Set audio profile for better quality
      await this.rtcEngine.setAudioProfile(
        AudioSampleRateType.AudioSampleRateType48000,
        0
      );

      // Set channel profile to communication (1-to-1 or group calls)
      await this.rtcEngine.setChannelProfile(ChannelProfile.Communication);

      // Set client role as broadcaster (can send and receive audio)
      await this.rtcEngine.setClientRole(ClientRole.Broadcaster);

      // Register event listeners
      this.setupEventListeners();

      console.log('[AgoraReal] ✓ Agora RTC Engine initialized successfully');
      return true;
    } catch (error: any) {
      console.error('[AgoraReal] ✗ Failed to initialize Agora:', error.message);
      return false;
    }
  }

  /**
   * Join Agora Channel
   */
  async joinChannel(config: VoIPConfig): Promise<boolean> {
    try {
      if (!this.rtcEngine) {
        throw new Error('RTC Engine not initialized');
      }

      console.log('[AgoraReal] Joining channel:', config.channelName);

      this.channelName = config.channelName;

      // Use token from config or environment
      const token = config.token || AGORA_TEMP_TOKEN;

      if (!token) {
        console.warn('[AgoraReal] ⚠ No token provided, joining without token');
      }

      // Join channel with token and UID
      await this.rtcEngine.joinChannel(
        token || '', // Use token if available
        config.channelName,
        '',
        config.uid
      );

      console.log('[AgoraReal] ✓ Successfully joined channel');
      return true;
    } catch (error: any) {
      console.error('[AgoraReal] ✗ Failed to join channel:', error.message);
      return false;
    }
  }

  /**
   * Leave Channel
   */
  async leaveChannel(): Promise<boolean> {
    try {
      if (!this.rtcEngine) {
        throw new Error('RTC Engine not initialized');
      }

      console.log('[AgoraReal] Leaving channel...');
      await this.rtcEngine.leaveChannel();
      console.log('[AgoraReal] ✓ Left channel successfully');
      return true;
    } catch (error: any) {
      console.error('[AgoraReal] ✗ Failed to leave channel:', error.message);
      return false;
    }
  }

  /**
   * Enable/Disable Audio
   */
  async enableAudio(enabled: boolean): Promise<boolean> {
    try {
      if (!this.rtcEngine) {
        throw new Error('RTC Engine not initialized');
      }

      if (enabled) {
        await this.rtcEngine.enableLocalAudio(true);
        console.log('[AgoraReal] ✓ Audio enabled');
      } else {
        await this.rtcEngine.enableLocalAudio(false);
        console.log('[AgoraReal] ✓ Audio disabled (muted)');
      }

      return true;
    } catch (error: any) {
      console.error('[AgoraReal] ✗ Failed to toggle audio:', error.message);
      return false;
    }
  }

  /**
   * Setup Event Listeners
   */
  private setupEventListeners(): void {
    if (!this.rtcEngine) return;

    // User joined event
    this.rtcEngine.addListener('UserJoined', (data: any) => {
      console.log('[AgoraReal] User joined:', data.uid);
      this.emit('UserJoined', { uid: data.uid });
    });

    // User offline event
    this.rtcEngine.addListener('UserOffline', (data: any) => {
      console.log('[AgoraReal] User offline:', data.uid);
      this.emit('UserOffline', { uid: data.uid });
    });

    // Join channel success
    this.rtcEngine.addListener('JoinChannelSuccess', (data: any) => {
      console.log('[AgoraReal] Join channel success:', data);
      this.emit('JoinChannelSuccess', data);
    });

    // Connection state changed
    this.rtcEngine.addListener('ConnectionStateChanged', (data: any) => {
      console.log('[AgoraReal] Connection state changed:', data);
      this.emit('ConnectionStateChanged', data);
    });

    // Audio volume indication
    this.rtcEngine.addListener('AudioVolumeIndication', (data: any) => {
      this.emit('AudioVolumeIndication', data);
    });

    // RTC Error
    this.rtcEngine.addListener('Error', (error: any) => {
      console.error('[AgoraReal] Agora Error:', error);
      this.emit('Error', error);
    });
  }

  /**
   * Destroy Engine (Cleanup)
   */
  async destroy(): Promise<boolean> {
    try {
      if (this.rtcEngine) {
        console.log('[AgoraReal] Destroying RTC Engine...');
        await this.leaveChannel();
        await this.rtcEngine.destroy();
        this.rtcEngine = null;
        console.log('[AgoraReal] ✓ RTC Engine destroyed');
      }
      return true;
    } catch (error: any) {
      console.error('[AgoraReal] ✗ Failed to destroy engine:', error.message);
      return false;
    }
  }

  /**
   * Check if Engine is Ready
   */
  isReady(): boolean {
    return this.rtcEngine !== null;
  }

  /**
   * Emit Event
   */
  private emit(event: string, data?: any): void {
    const callbacks = this.eventListeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  /**
   * Register Event Listener
   */
  registerEventListeners(listeners: any): void {
    Object.keys(listeners).forEach(event => {
      this.eventListeners.set(event, [listeners[event]]);
    });
  }

  /**
   * Add Event Listener
   */
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }
}

// Export singleton
export const realAgoraService = new RealAgoraVoIPService();

/**
 * USAGE INSTRUCTIONS
 * 
 * When you're ready to integrate real Agora:
 * 
 * 1. Install dependencies:
 *    npm install react-native-agora
 * 
 * 2. In voipService.ts, replace mock with this real implementation
 * 
 * 3. Replace this in app/call/[expertId].tsx:
 *    OLD: import { voipService, AGORA_APP_ID } from '../../utils/voipService';
 *    NEW: import { realAgoraService as voipService, AGORA_APP_ID } from '../../utils/voipService';
 * 
 * 4. Build:
 *    npx expo prebuild
 *    npm run build:android  (or build:ios)
 * 
 * 5. Test on real device (not simulator)
 * 
 * 6. Verify in console:
 *    [AgoraReal] User joined: (uid)
 *    [AgoraReal] Audio enabled
 *    [AgoraReal] Connection state changed
 */
