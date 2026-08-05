import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { isNativeApp } from '@/lib/platform/native';
import { handleAuthDeepLink, isAuthDeepLinkUrl } from '@/lib/auth/handleAuthDeepLink';

/**
 * When the user taps the Supabase confirmation email on a phone, Android opens QUM
 * via com.arch.surf://auth/callback — not https://localhost in Chrome.
 */
export function useAuthDeepLink() {
  useEffect(() => {
    if (!isNativeApp()) return;

    const processUrl = (url: string | undefined) => {
      if (!url || !isAuthDeepLinkUrl(url)) return;
      void handleAuthDeepLink(url);
    };

    void App.getLaunchUrl().then((result) => {
      processUrl(result?.url);
    });

    const sub = App.addListener('appUrlOpen', (event) => {
      processUrl(event.url);
    });

    return () => {
      void sub.then((h) => h.remove());
    };
  }, []);
}
