import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { LocalNotifications } from '@capacitor/local-notifications';
import { isNativeApp } from '@/lib/platform/native';
import { CALM_HOUR_NOTIFICATION_ID } from '@/services/notificationService';
import { useCalmHourScheduler } from '@/hooks/useCalmHourScheduler';
import { usePredictiveUrgeWarnings } from '@/hooks/usePredictiveUrgeWarnings';
import { useAuth } from '@/hooks/useAuth';
import { useSessionLockGuard } from '@/hooks/useSessionLockGuard';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useWaveStore } from '@/stores/waveStore';
import { useProfileStore } from '@/stores/profileStore';
import { useCommitmentStore } from '@/stores/commitmentStore';
import { useLetterStore } from '@/stores/letterStore';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { SignUpScreen } from '@/components/auth/SignUpScreen';
import { CheckEmailScreen } from '@/components/auth/CheckEmailScreen';
import { AuthCallbackScreen } from '@/components/auth/AuthCallbackScreen';
import { isAuthCallbackRoute } from '@/lib/auth/redirectUrl';
import { HomeScreen } from '@/components/home/HomeScreen';
import { WaveSession } from '@/components/wave/WaveSession';
import { DashboardScreen } from '@/components/dashboard/DashboardScreen';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { SessionTimer } from '@/components/ui/SessionTimer';
import { BottomNavBar } from '@/components/ui/BottomNavBar';
import { RageQuitOverlay } from '@/components/wave/RageQuitOverlay';
import { WaveEndToast } from '@/components/ui/WaveEndToast';
import { AppMain, AppShell } from '@/components/layout/AppShell';
import { ScreenTransition } from '@/components/layout/ScreenTransition';
import { HaltBarLoader } from '@/design-system/identity';
import { fadeIn, fadeUp, slideX, waveScreen } from '@/lib/motion';
import { REFLECTION_NOTIFICATION_ID } from '@/services/reflectionScheduler';
import type { ReflectionOpenContext } from '@/types/reflection';

import { useDesktopGuard } from '@/hooks/useDesktopGuard';
import { DesktopGuardScreen } from '@/components/desktop/DesktopGuardScreen';

type AppView = 'home' | 'dashboard';

export default function App() {
  const { isDesktop } = useDesktopGuard();
  const { user, loading, authGate } = useAuth();
  const mode = useWaveStore((s) => s.mode);
  const isLocked = useWaveStore((s) => s.isLocked);
  const profile = useProfileStore((s) => s.profile);
  const [view, setView] = useState<AppView>('home');
  const [profileReady, setProfileReady] = useState(false);
  const [calmHourOpenRequest, setCalmHourOpenRequest] = useState(0);
  const [reflectionOpenRequest, setReflectionOpenRequest] =
    useState<ReflectionOpenContext | null>(null);
  const navDirection = useRef<1 | -1>(1);

  const onboardingDone = Boolean(profile?.has_completed_onboarding);
  useCalmHourScheduler(user?.id ?? null, onboardingDone && !loading);
  usePredictiveUrgeWarnings(onboardingDone && !loading ? user?.id ?? null : null);

  const { checking, showRageQuitOverlay, dismissRageQuitOverlay } = useSessionLockGuard(
    !!user && !loading,
  );
  const waveEndToast = useWaveStore((s) => s.waveEndToast);
  const clearWaveEndToast = useWaveStore((s) => s.clearWaveEndToast);
  useOfflineSync(user?.id ?? null);

  useEffect(() => {
    if (!user) {
      setProfileReady(false);
      useLetterStore.getState().clear();
      return;
    }

    let cancelled = false;
    setProfileReady(false);

    // Fallback: Ensure PWA never hangs on loading screen if network profile load stalls
    const timeout = setTimeout(() => {
      if (!cancelled) setProfileReady(true);
    }, 3500);

    try {
      useWaveStore.getState().hydrate();
      useCommitmentStore.getState().hydrate(user.id);
      void useCommitmentStore.getState().load(user.id);
      useLetterStore.getState().hydrate(user.id);
    } catch (err) {
      console.error('commitment hydrate', err);
      useCommitmentStore.getState().clear();
      useLetterStore.getState().clear();
    }

    void useProfileStore
      .getState()
      .loadProfile(user.id, { force: true })
      .catch((err) => console.error('loadProfile', err))
      .finally(() => {
        clearTimeout(timeout);
        if (!cancelled) setProfileReady(true);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [user?.id]);

  useEffect(() => {
    if (isLocked) setView('home');
  }, [isLocked]);

  useEffect(() => {
    if (!profile?.has_completed_onboarding) {
      setView('home');
    }
  }, [profile?.has_completed_onboarding]);

  useEffect(() => {
    if (!isNativeApp() || !onboardingDone) return;

    const openCalmHour = () => {
      navDirection.current = -1;
      setView('home');
      setCalmHourOpenRequest((n) => n + 1);
    };

    const openReflectionFromNotification = (extra?: Record<string, unknown>) => {
      navDirection.current = -1;
      setView('home');
      setReflectionOpenRequest({
        waveId: typeof extra?.wave_id === 'string' ? extra.wave_id : null,
        mode: 'delayed_prompt',
      });
    };

    const onReceived = LocalNotifications.addListener(
      'localNotificationReceived',
      (notification) => {
        if (notification.id === CALM_HOUR_NOTIFICATION_ID) openCalmHour();
        if (notification.id === REFLECTION_NOTIFICATION_ID) {
          openReflectionFromNotification(notification.extra);
        }
      },
    );
    const onAction = LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (event) => {
        if (event.notification.id === CALM_HOUR_NOTIFICATION_ID) openCalmHour();
        if (event.notification.id === REFLECTION_NOTIFICATION_ID) {
          openReflectionFromNotification(event.notification.extra);
        }
      },
    );

    return () => {
      void onReceived.then((h) => h.remove());
      void onAction.then((h) => h.remove());
    };
  }, [onboardingDone]);

  useEffect(() => {
    const onOpen = () => {
      navDirection.current = -1;
      setView('home');
      setCalmHourOpenRequest((n) => n + 1);
    };
    window.addEventListener('qum:open-calm-hour', onOpen);
    return () => window.removeEventListener('qum:open-calm-hour', onOpen);
  }, []);

  useEffect(() => {
    if (!isLocked) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isLocked]);

  const openDashboard = () => {
    if (!profile?.has_completed_onboarding) return;
    navDirection.current = 1;
    setView('dashboard');
  };

  const startCalmHour = () => {
    navDirection.current = -1;
    setView('home');
    setCalmHourOpenRequest((n) => n + 1);
  };

  const goHome = () => {
    navDirection.current = -1;
    setView('home');
  };

  if (isAuthCallbackRoute()) {
    return (
      <AppShell>
        <AppMain>
          <ScreenTransition variants={fadeUp}>
            <AuthCallbackScreen />
          </ScreenTransition>
        </AppMain>
      </AppShell>
    );
  }

  const bootLoading = loading || checking || (!!user && !profileReady);

  if (bootLoading) {
    return (
      <AppShell>
        <AppMain>
          <ScreenTransition variants={fadeIn}>
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <HaltBarLoader height={32} />
              <p className="text-label uppercase text-secondary">Loading…</p>
            </div>
          </ScreenTransition>
        </AppMain>
      </AppShell>
    );
  }

  if (isDesktop) {
    return <DesktopGuardScreen />;
  }

  if (!user) {
    const authView =
      authGate === 'check_email' ? (
        <CheckEmailScreen />
      ) : authGate === 'sign_up' ? (
        <SignUpScreen />
      ) : (
        <AuthScreen />
      );

    return (
      <AppShell>
        <AppMain>
          <ScreenTransition variants={fadeUp}>{authView}</ScreenTransition>
        </AppMain>
      </AppShell>
    );
  }

  const needsOnboarding = !profile?.has_completed_onboarding;
  const inSession = !needsOnboarding && mode !== 'IDLE';

  if (needsOnboarding) {
    return (
      <AppShell>
        <AppMain>
          <ScreenTransition key="onboarding" variants={fadeUp}>
            <OnboardingFlow />
          </ScreenTransition>
        </AppMain>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AnimatePresence>
        {showRageQuitOverlay && (
          <RageQuitOverlay key="rage-quit" onDismiss={dismissRageQuitOverlay} />
        )}
      </AnimatePresence>
      <WaveEndToast message={waveEndToast} onDismiss={clearWaveEndToast} />
      <SessionTimer />
      <AppMain>
        <AnimatePresence mode="wait" initial={false}>
          {inSession ? (
            <ScreenTransition key="wave" variants={waveScreen}>
              <WaveSession />
            </ScreenTransition>
          ) : view === 'dashboard' ? (
            <ScreenTransition key="dashboard" variants={slideX(navDirection.current)}>
              <DashboardScreen
                userId={user.id}
                onStartCalmHour={startCalmHour}
              />
            </ScreenTransition>
          ) : (
            <ScreenTransition key="home" variants={slideX(navDirection.current)}>
              <HomeScreen
                userId={user.id}
                email={user.email}
                openCalmHourRequest={calmHourOpenRequest}
                openReflectionRequest={reflectionOpenRequest}
                onReflectionClosed={() => setReflectionOpenRequest(null)}
              />
            </ScreenTransition>
          )}
        </AnimatePresence>
      </AppMain>
      {!inSession && (
        <BottomNavBar
          activeTab={view}
          onChangeTab={(tab) => {
            if (tab === 'home') {
              goHome();
            } else {
              openDashboard();
            }
          }}
        />
      )}
    </AppShell>
  );
}
