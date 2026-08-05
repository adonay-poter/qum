import { useState } from 'react';
import { Page } from '@/components/layout/Page';
import { getHapticsEnabled, setHapticsEnabled } from '@/lib/haptics';

export type SettingsDestination =
  | 'brief'
  | 'letter'
  | 'voice_memo'
  | 'reflections'
  | 'calm_hour'
  | 'find_support'
  | 'sign_out';

interface SettingsScreenProps {
  email?: string | null;
  onNavigate: (dest: SettingsDestination) => void;
  onDone: () => void;
}

function SettingsRow({
  label,
  description,
  onClick,
}: {
  label: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={description ? `${label}. ${description}` : label}
      className="w-full border border-secondary/25 bg-surface/80 px-3 py-3 text-left"
    >
      <span className="text-body text-primary">{label}</span>
      {description && (
        <span className="mt-1 block text-[0.72rem] leading-relaxed text-secondary">
          {description}
        </span>
      )}
    </button>
  );
}

export function SettingsScreen({ email, onNavigate, onDone }: SettingsScreenProps) {
  const [hapticsOn, setHapticsOn] = useState(() => getHapticsEnabled());

  return (
    <Page>
      <div className="flex h-full min-h-0 flex-col py-4">
        <button
          type="button"
          onClick={onDone}
          aria-label="Back to home"
          className="self-start px-2 py-1 text-label uppercase text-secondary"
        >
          ← Back
        </button>

        <h1 className="mt-4 text-h1 text-primary">Settings</h1>
        {email && (
          <p className="mt-2 truncate text-[0.72rem] text-secondary" title={email}>
            {email}
          </p>
        )}

        <nav className="mt-6 flex flex-col gap-2" aria-label="Settings">
          <p className="text-label uppercase text-secondary">Feedback</p>
          <label className="flex w-full items-start gap-3 border border-secondary/25 bg-surface/80 px-3 py-3">
            <input
              type="checkbox"
              checked={hapticsOn}
              onChange={(e) => {
                const next = e.target.checked;
                setHapticsOn(next);
                setHapticsEnabled(next);
              }}
              className="mt-1 shrink-0 accent-tertiary"
              aria-label="Haptic feedback"
            />
            <span>
              <span className="text-body text-primary">Haptic feedback</span>
              <span className="mt-1 block text-[0.72rem] leading-relaxed text-secondary">
                Light pulses during waves on Android. Off everywhere when disabled.
              </span>
            </span>
          </label>

          <p className="mt-4 text-label uppercase text-secondary">Content</p>
          <SettingsRow
            label="Why urges pass"
            description="~14 min — the science behind surfing a craving"
            onClick={() => onNavigate('brief')}
          />
          <SettingsRow
            label="Edit letter"
            description="Your note to future you during waves"
            onClick={() => onNavigate('letter')}
          />
          <SettingsRow
            label="Manage voice memo"
            description="Re-record why this matters to you"
            onClick={() => onNavigate('voice_memo')}
          />
          <SettingsRow
            label="Reflection history"
            description="Past slips and wave reflections"
            onClick={() => onNavigate('reflections')}
          />
          <SettingsRow
            label="Calm-hour reminder"
            description="Weekly check-in day and time"
            onClick={() => onNavigate('calm_hour')}
          />
          <SettingsRow
            label="Find support"
            description="Crisis lines and therapist search"
            onClick={() => onNavigate('find_support')}
          />
          <SettingsRow label="Sign out" onClick={() => onNavigate('sign_out')} />
        </nav>
      </div>
    </Page>
  );
}
