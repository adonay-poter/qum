import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App as CapApp } from '@capacitor/app';
import App from './App';
import { AuthProvider } from '@/hooks/useAuth';
import { useAuthDeepLink } from '@/hooks/useAuthDeepLink';
import { SplashScreen } from '@/components/brand/SplashScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './index.css';
import { initAppStorage } from '@/lib/storage/appStorage';
import { initHapticsFromStorage } from '@/lib/haptics';
import { initNativeChrome, markNativeShell } from '@/lib/platform/initNativeChrome';
import { isNativeApp } from '@/lib/platform/native';
import { requestNotificationPermission } from '@/services/notificationService';

markNativeShell();

const SPLASH_MS = 1200;

function Root() {
  useAuthDeepLink();
  const [showSplash, setShowSplash] = useState(true);
  const [splashStatus, setSplashStatus] = useState<'booting' | 'ready'>('booting');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const minDelay = new Promise((r) => setTimeout(r, SPLASH_MS));
      try {
        await initAppStorage();
        initHapticsFromStorage();
        if (!cancelled) setSplashStatus('ready');
      } catch (err) {
        console.error('initAppStorage failed', err);
        if (!cancelled) setSplashStatus('ready');
      }
      await minDelay;
      if (!cancelled) setShowSplash(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isNativeApp()) return;

    void initNativeChrome();
    void requestNotificationPermission();

    const sub = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        window.dispatchEvent(new Event('qum:app-resume'));
      }
    });

    return () => {
      void sub.then((h) => h.remove());
    };
  }, []);

  if (showSplash) {
    return <SplashScreen status={splashStatus} />;
  }

  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
);
