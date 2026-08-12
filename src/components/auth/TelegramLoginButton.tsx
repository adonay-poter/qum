import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  createTelegramAuthSession,
  subscribeToTelegramAuthSession,
} from '@/services/telegramAuthService';

export interface TelegramLoginButtonProps {
  botName?: string;
  className?: string;
  onAuthSuccess?: () => void;
  onError?: (err: Error) => void;
}

export function TelegramLoginButton({
  botName = import.meta.env.VITE_TELEGRAM_BOT_NAME ?? 'vMebachabot',
  className = '',
  onAuthSuccess,
  onError,
}: TelegramLoginButtonProps) {
  const [waiting, setWaiting] = useState(false);
  const [loading, setLoading] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const cleanBotName = botName.replace(/^@/, '').trim();

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  const handleStartTelegramAuth = async () => {
    setLoading(true);
    try {
      const sessionCode = await createTelegramAuthSession();
      if (!sessionCode) {
        throw new Error('Failed to initialize Telegram login session');
      }

      // Cleanup any previous subscription
      if (cleanupRef.current) cleanupRef.current();

      // Subscribe to Realtime approval
      cleanupRef.current = subscribeToTelegramAuthSession(sessionCode, async (tokens) => {
        setWaiting(false);
        setLoading(false);
        const { error } = await supabase.auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });

        if (error) {
          if (onError) onError(error);
        } else {
          if (onAuthSuccess) onAuthSuccess();
        }
      });

      setWaiting(true);
      setLoading(false);

      // Open Telegram App via Deep Link (or web fallback)
      const telegramUrl = `https://t.me/${cleanBotName}?start=auth_${sessionCode}`;
      window.open(telegramUrl, '_blank');
    } catch (err: unknown) {
      setLoading(false);
      setWaiting(false);
      const e = err instanceof Error ? err : new Error('Telegram login failed');
      if (onError) onError(e);
    }
  };

  const handleCancel = () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setWaiting(false);
    setLoading(false);
  };

  if (waiting) {
    return (
      <div className={`flex flex-col gap-2 items-center text-center p-4 border border-tertiary/40 bg-surface/50 rounded-none ${className}`}>
        <div className="flex items-center gap-2 text-primary font-medium">
          <svg className="w-5 h-5 animate-spin text-tertiary" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Waiting for Telegram confirmation…</span>
        </div>
        <p className="text-xs text-secondary max-w-xs">
          Tap <span className="font-semibold text-primary">"START"</span> in Telegram to complete login.
        </p>
        <button
          type="button"
          onClick={handleCancel}
          className="mt-1 text-xs text-secondary underline hover:text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleStartTelegramAuth}
      className={`w-full flex items-center justify-center gap-3 bg-[#24A1DE] hover:bg-[#1D8AC0] text-white px-5 py-3 text-body font-semibold transition-all disabled:opacity-50 ${className}`}
    >
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.16l-2.02 9.53c-.15.68-.56.84-1.13.52l-3.1-2.28-1.5 1.44c-.17.17-.31.31-.64.31l.22-3.17 5.77-5.21c.25-.22-.05-.34-.39-.12l-7.14 4.5-3.07-.96c-.67-.21-.68-.67.14-.99l12.01-4.63c.56-.21 1.05.13.85.99z" />
      </svg>
      <span>{loading ? 'Opening Telegram…' : 'Login with Telegram'}</span>
    </button>
  );
}
