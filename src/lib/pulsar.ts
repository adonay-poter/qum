import { registerPlugin, Capacitor } from '@capacitor/core';
import { getHapticsEnabled } from '@/lib/haptics';

export interface PulsarPluginInterface {
  playPreset(options: { name: string }): Promise<void>;
  playInhaleWave(): Promise<void>;
  playExhaleWave(): Promise<void>;
  playHeartbeat(): Promise<void>;
  stopActiveWave(): Promise<void>;
}

// Register the native Capacitor plugin bridge
const NativePulsar = registerPlugin<PulsarPluginInterface>('Pulsar');

// Custom safe wrapper that respects the global haptics toggle and provides safe web fallbacks
export const pulsar = {
  async playPreset(name: string): Promise<void> {
    if (!getHapticsEnabled()) return;

    if (Capacitor.isNativePlatform()) {
      try {
        await NativePulsar.playPreset({ name });
      } catch (err) {
        console.error(`[Pulsar] Failed to play preset "${name}":`, err);
      }
    } else {
      console.log(`[Pulsar Web Fallback] Play preset: "${name}"`);
      // Standard browser vibration API fallback for simple haptics if supported
      if ('vibrate' in navigator) {
        if (name === 'hammer' || name === 'systemImpactHeavy') {
          navigator.vibrate(40);
        } else if (name === 'selection' || name === 'systemImpactLight') {
          navigator.vibrate(15);
        } else if (name === 'success') {
          navigator.vibrate([30, 50, 30]);
        } else if (name === 'boulder') {
          navigator.vibrate([45, 15, 30]); // Heavy rock thud fallback
        } else if (name === 'bassDrop') {
          navigator.vibrate([20, 50]); // Bass drop double vibration fallback
        }
      }
    }
  },

  async startInhaleWave(): Promise<void> {
    if (!getHapticsEnabled()) return;

    if (Capacitor.isNativePlatform()) {
      try {
        await NativePulsar.playInhaleWave();
      } catch (err) {
        console.error('[Pulsar] Failed to play Inhale Wave:', err);
      }
    } else {
      console.log('[Pulsar Web Fallback] Start Inhale Wave (0ms -> 4000ms: Smooth Amplitude Swell 0% -> 100%)');
    }
  },

  async startExhaleWave(): Promise<void> {
    if (!getHapticsEnabled()) return;

    if (Capacitor.isNativePlatform()) {
      try {
        await NativePulsar.playExhaleWave();
      } catch (err) {
        console.error('[Pulsar] Failed to play Exhale Wave:', err);
      }
    } else {
      console.log('[Pulsar Web Fallback] Start Exhale Wave (0ms -> 4000ms: Smooth Amplitude Decay 100% -> 0%)');
    }
  },

  async startHeartbeat(): Promise<void> {
    if (!getHapticsEnabled()) return;

    if (Capacitor.isNativePlatform()) {
      try {
        await NativePulsar.playHeartbeat();
      } catch (err) {
        console.error('[Pulsar] Failed to play Heartbeat:', err);
      }
    } else {
      console.log('[Pulsar Web Fallback] Start Heartbeat (Double Pulsing low-intensity loop)');
      if ('vibrate' in navigator) {
        navigator.vibrate([80, 100, 80]);
      }
    }
  },

  async stopActiveWave(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await NativePulsar.stopActiveWave();
      } catch (err) {
        console.error('[Pulsar] Failed to stop active wave:', err);
      }
    } else {
      console.log('[Pulsar Web Fallback] Stop Active Wave');
      if ('vibrate' in navigator) {
        navigator.vibrate(0); // Stops browser vibration
      }
    }
  }
};
