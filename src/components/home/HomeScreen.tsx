import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useWaveStore } from '@/stores/waveStore';
import { useCommitmentStore } from '@/stores/commitmentStore';
import { UrgeButton, type UrgeButtonSize } from './UrgeButton';
import { CommitmentsPanel } from './CommitmentsPanel';
import { CommitmentBreakScreen } from './CommitmentBreakScreen';
import { SetCommitmentScreen } from './SetCommitmentScreen';
import { LetterEditorScreen } from './LetterEditorScreen';
import { VoiceMemoSettings } from '@/components/settings/VoiceMemoSettings';
import { SettingsScreen, type SettingsDestination } from '@/components/settings/SettingsScreen';
import { ReflectionsHistoryScreen } from '@/components/settings/ReflectionsHistoryScreen';
import { CalmHourSettingsScreen } from '@/components/settings/CalmHourSettingsScreen';
import { CalmHourScreen } from '@/components/calm/CalmHourScreen';
import { secureSignOut } from '@/services/authService';
import { resilienceSubtitle } from '@/lib/resilience/resilienceModel';
import { ResilienceBreakdownSheet } from './ResilienceBreakdownSheet';
import { CalmHourReminderCard } from '@/components/calm/CalmHourReminderCard';
import { useCalmHour } from '@/hooks/useCalmHour';
import { Page } from '@/components/layout/Page';
import { useProfile } from '@/hooks/useProfile';
import { useCommitmentSlice } from '@/hooks/useCommitmentSlice';
import { clampResilience } from '@/lib/profileStats';
import type { Commitment } from '@/types/commitment';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { AppHeader } from '@/components/brand/AppHeader';
import { ResilienceShieldBar } from './ResilienceShieldBar';
import { SolidarityCard } from './SolidarityCard';
import { useSolidaritySignal } from '@/hooks/useSolidaritySignal';
import { ReflectionScreen } from '@/components/reflect/ReflectionScreen';
import { SupportCard } from '@/components/crisis/SupportCard';
import { FindSupportScreen } from '@/components/settings/FindSupportScreen';
import { BriefScreen } from '@/components/settings/BriefScreen';
import { RecentWavesList } from './RecentWavesList';
import { RedirectionTools } from './RedirectionTools';
import { AllWavesScreen } from './AllWavesScreen';
import { fetchRecentWaves } from '@/services/waveService';
import { useCrisisSignal } from '@/hooks/useCrisisSignal';
import { psychologyTodayTherapistUrl } from '@/lib/crisis/hotlines';
import { openSupportLink } from '@/lib/crisis/openSupportLink';
import { trackEvent } from '@/services/telemetryService';
import type { ReflectionOpenContext } from '@/types/reflection';
import type { WaveLog } from '@/types/database';

interface HomeScreenProps {
  userId: string;
  email?: string | null;
  openCalmHourRequest?: number;
  openReflectionRequest?: ReflectionOpenContext | null;
  onReflectionClosed?: () => void;
}

function StatValue({ value, loading }: { value: number | null; loading: boolean }) {
  if (loading || value === null) {
    return <span className="text-h1 text-secondary">—</span>;
  }
  return <span className="text-h1 text-primary">{value}</span>;
}

function resolveUrgeSize(active: Commitment | null, upcomingCount: number): UrgeButtonSize {
  if (active || upcomingCount > 0) return 'compact';
  return 'default';
}

export function HomeScreen({
  userId,
  email,
  openCalmHourRequest = 0,
  openReflectionRequest = null,
  onReflectionClosed,
}: HomeScreenProps) {
  const { profile } = useProfile(userId);
  const triggerUrge = useWaveStore((s) => s.triggerUrge);
  const loadCommitments = useCommitmentStore((s) => s.load);
  const breakCommitment = useCommitmentStore((s) => s.breakCommitment);
  const consumeHonoredCelebration = useCommitmentStore((s) => s.consumeHonoredCelebration);
  const commitmentsHydrated = useCommitmentStore((s) => s.hydrated);
  const showWaveEndToast = useWaveStore((s) => s.showWaveEndToast);
  const { active, upcoming } = useCommitmentSlice();
  const [starting, setStarting] = useState(false);
  const [showSetCommitment, setShowSetCommitment] = useState(false);
  const [showCommitmentBreak, setShowCommitmentBreak] = useState(false);
  const [showLetterEditor, setShowLetterEditor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVoiceMemoSettings, setShowVoiceMemoSettings] = useState(false);
  const [showReflectionsHistory, setShowReflectionsHistory] = useState(false);
  const [showCalmHourSettings, setShowCalmHourSettings] = useState(false);
  const [showFindSupport, setShowFindSupport] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const [briefSource, setBriefSource] = useState<'settings' | 'home'>('settings');
  const [showCalmHour, setShowCalmHour] = useState(false);
  const [showAllWaves, setShowAllWaves] = useState(false);
  const [showResilienceBreakdown, setShowResilienceBreakdown] = useState(false);
  const [reflectionContext, setReflectionContext] = useState<ReflectionOpenContext | null>(
    null,
  );
  const [recentWaves, setRecentWaves] = useState<WaveLog[]>([]);
  const [recentWavesLoading, setRecentWavesLoading] = useState(false);
  const calmHour = useCalmHour(userId);
  const crisis = useCrisisSignal(userId);
  const solidarity = useSolidaritySignal(true);
  const urgeSize = useMemo(
    () => (commitmentsHydrated ? resolveUrgeSize(active, upcoming.length) : 'default'),
    [commitmentsHydrated, active, upcoming.length],
  );

  useEffect(() => {
    void loadCommitments(userId);
  }, [userId, loadCommitments]);

  useEffect(() => {
    if (!commitmentsHydrated) return;
    const celebration = consumeHonoredCelebration();
    if (celebration) showWaveEndToast(celebration.message);
  }, [commitmentsHydrated, consumeHonoredCelebration, showWaveEndToast]);

  useEffect(() => {
    if (openCalmHourRequest > 0) setShowCalmHour(true);
  }, [openCalmHourRequest]);

  useEffect(() => {
    if (openReflectionRequest) setReflectionContext(openReflectionRequest);
  }, [openReflectionRequest]);

  const loadRecentWaves = async () => {
    setRecentWavesLoading(true);
    const waves = await fetchRecentWaves(userId);
    setRecentWaves(waves);
    setRecentWavesLoading(false);
  };

  useEffect(() => {
    void loadRecentWaves();
  }, [userId]);

  const closeReflection = () => {
    setReflectionContext(null);
    onReflectionClosed?.();
    void loadRecentWaves();
  };

  const openReflection = (ctx: ReflectionOpenContext) => {
    setReflectionContext(ctx);
  };

  const resilience = profile ? clampResilience(profile.resilience_level) : null;
  const xp = profile?.xp_points ?? null;
  const waves = profile?.total_waves_surfed ?? null;
  const statsReady = profile !== null;

  const handleUrge = async () => {
    setStarting(true);
    await triggerUrge();
    setStarting(false);
  };

  const handleSettingsNavigate = (dest: SettingsDestination) => {
    setShowSettings(false);
    if (dest === 'letter') setShowLetterEditor(true);
    if (dest === 'voice_memo') setShowVoiceMemoSettings(true);
    if (dest === 'reflections') setShowReflectionsHistory(true);
    if (dest === 'calm_hour') setShowCalmHourSettings(true);
    if (dest === 'brief') {
      setBriefSource('settings');
      setShowBrief(true);
    }
    if (dest === 'find_support') setShowFindSupport(true);
    if (dest === 'sign_out') void secureSignOut();
  };

  const resilienceSubtitleText =
    resilience !== null ? resilienceSubtitle(resilience) : null;

  if (showSettings) {
    return (
      <SettingsScreen
        email={email}
        onNavigate={handleSettingsNavigate}
        onDone={() => setShowSettings(false)}
      />
    );
  }

  if (showReflectionsHistory) {
    return (
      <ReflectionsHistoryScreen
        userId={userId}
        onDone={() => setShowReflectionsHistory(false)}
      />
    );
  }

  if (showCalmHourSettings) {
    return (
      <CalmHourSettingsScreen
        userId={userId}
        onDone={() => setShowCalmHourSettings(false)}
      />
    );
  }

  if (showCommitmentBreak) {
    return (
      <CommitmentBreakScreen
        onSetNew={() => {
          setShowCommitmentBreak(false);
          setShowSetCommitment(true);
        }}
        onNotNow={() => setShowCommitmentBreak(false)}
      />
    );
  }

  if (showSetCommitment) {
    return (
      <SetCommitmentScreen userId={userId} onDone={() => setShowSetCommitment(false)} />
    );
  }

  if (showLetterEditor) {
    return (
      <LetterEditorScreen userId={userId} onDone={() => setShowLetterEditor(false)} />
    );
  }

  if (showVoiceMemoSettings) {
    return (
      <VoiceMemoSettings userId={userId} onDone={() => setShowVoiceMemoSettings(false)} />
    );
  }

  if (showBrief) {
    return <BriefScreen source={briefSource} onDone={() => setShowBrief(false)} />;
  }

  if (showFindSupport) {
    return (
      <FindSupportScreen
        addictionType={profile?.addiction_type ?? null}
        includeCrisisExtras
        onDone={() => setShowFindSupport(false)}
      />
    );
  }

  if (reflectionContext) {
    return (
      <ReflectionScreen userId={userId} context={reflectionContext} onDone={closeReflection} />
    );
  }

  if (showAllWaves) {
    return (
      <AllWavesScreen
        userId={userId}
        onReflect={(waveId) => {
          setShowAllWaves(false);
          openReflection({ waveId, mode: 'post_wave' });
        }}
        onDone={() => setShowAllWaves(false)}
      />
    );
  }

  if (showCalmHour) {
    return (
      <CalmHourScreen
        userId={userId}
        onDone={() => {
          setShowCalmHour(false);
          void calmHour.refresh();
        }}
        onEditLetter={() => {
          setShowCalmHour(false);
          setShowLetterEditor(true);
        }}
        onReRecordVoice={() => {
          setShowCalmHour(false);
          setShowVoiceMemoSettings(true);
        }}
      />
    );
  }

  return (
    <Page>
      <ResilienceBreakdownSheet
        open={showResilienceBreakdown}
        onClose={() => setShowResilienceBreakdown(false)}
        userId={userId}
        currentLevel={resilience ?? 50}
      />
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-6 py-4 pb-12"
      >
        <AppHeader email={email} onOpenSettings={() => setShowSettings(true)} />

        <motion.div variants={staggerItem} className="flex flex-col gap-4">
          <motion.div variants={staggerItem}>
            <p className="text-label uppercase text-secondary">Resilience shield</p>
            <motion.div className="mt-2 flex items-end gap-2">
              <span className="text-display text-primary">
                {resilience !== null ? resilience : '—'}
              </span>
              <span className="pb-2 text-body text-secondary">/ 100</span>
            </motion.div>
            <ResilienceShieldBar value={resilience} />
            {resilienceSubtitleText && (
              <p className="mt-2 text-[0.72rem] leading-relaxed text-secondary">
                {resilienceSubtitleText}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {resilience !== null && (
                <button
                  type="button"
                  onClick={() => setShowResilienceBreakdown(true)}
                  className="text-[0.68rem] font-normal uppercase tracking-[0.1em] text-secondary/70 underline-offset-2 hover:underline"
                >
                  What goes into this?
                </button>
              )}
            </div>
          </motion.div>

          {crisis.cardVisible && crisis.severity && (
            <motion.div variants={staggerItem} className="mt-3">
              <SupportCard
                severity={crisis.severity}
                onTalkToSomeone={() => {
                  trackEvent('crisis_action_tapped', {
                    action: 'talk',
                    surface: 'card',
                  });
                  setShowFindSupport(true);
                }}
                onFindTherapist={() => {
                  trackEvent('crisis_action_tapped', {
                    action: 'therapist',
                    surface: 'card',
                  });
                  void openSupportLink(psychologyTodayTherapistUrl());
                }}
                onDismiss={() => {
                  crisis.dismissCard();
                }}
              />
            </motion.div>
          )}

          <motion.div
            variants={staggerItem}
            className="mt-4 grid grid-cols-2 gap-3 border border-secondary/20 bg-surface/30 backdrop-blur-sm rounded-lg p-4"
          >
            <div>
              <p className="text-label uppercase text-secondary">XP</p>
              <p className="mt-1">
                <StatValue value={xp} loading={!statsReady} />
              </p>
            </div>
            <motion.div
              key={waves ?? 'waves'}
              initial={{ scale: 1.04, opacity: 0.85 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
            >
              <p className="text-label uppercase text-secondary">Waves surfed</p>
              <p className="mt-1">
                <StatValue value={waves} loading={!statsReady} />
              </p>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div variants={staggerItem} className="flex flex-col gap-3">
          {calmHour.cardVisible && (
            <CalmHourReminderCard
              onOpen={() => setShowCalmHour(true)}
              onDismiss={calmHour.dismissCard}
            />
          )}
          <SolidarityCard
            activeNow={solidarity.activeNow}
            surfsToday={solidarity.surfsToday}
            hourly={solidarity.hourly}
            loading={solidarity.loading}
          />
        </motion.div>

        <motion.div variants={staggerItem} className="flex justify-center py-4">
          <UrgeButton onTrigger={handleUrge} disabled={starting} size={urgeSize} />
        </motion.div>

        <motion.div
          variants={staggerItem}
          className="flex flex-col gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <RedirectionTools
            onLogSlip={() => openReflection({ waveId: null, mode: 'manual_log' })}
            onOpenScience={() => {
              setBriefSource('home');
              setShowBrief(true);
            }}
          />

          <CommitmentsPanel
            onSetCommitment={() => setShowSetCommitment(true)}
            onBreakCommitment={async () => {
              if (!active) return;
              await breakCommitment(active.id);
              setShowCommitmentBreak(true);
            }}
          />

          <RecentWavesList
            waves={recentWaves}
            loading={recentWavesLoading}
            onReflect={(waveId) => openReflection({ waveId, mode: 'post_wave' })}
            onSeeAll={() => setShowAllWaves(true)}
          />
        </motion.div>
      </motion.div>
    </Page>
  );
}
