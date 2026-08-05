import { Capacitor } from '@capacitor/core';

/** Mark native shell so CSS applies minimum safe-area insets (Android WebView). */
export function markNativeShell(): void {
  if (Capacitor.isNativePlatform()) {
    document.body.classList.add('capacitor-native');
  }
}

/** Reserved for optional StatusBar plugin wiring; CSS fallbacks always apply. */
export async function initNativeChrome(): Promise<void> {
  markNativeShell();
}
