import { useEffect, useRef, useState } from 'react';
import type { TelegramUserPayload } from '@/services/authService';

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUserPayload) => void;
  }
}

export interface TelegramLoginButtonProps {
  botName?: string;
  buttonSize?: 'large' | 'medium' | 'small';
  cornerRadius?: number;
  requestAccess?: 'write' | 'read';
  showAvatar?: boolean;
  className?: string;
  onAuth: (user: TelegramUserPayload) => void;
}

export function TelegramLoginButton({
  botName = import.meta.env.VITE_TELEGRAM_BOT_NAME ?? '',
  buttonSize = 'large',
  cornerRadius = 4,
  requestAccess = 'write',
  showAvatar = true,
  className = '',
  onAuth,
}: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  // Sanitize bot username by stripping leading '@' if provided
  const cleanBotName = botName.replace(/^@/, '').trim();

  useEffect(() => {
    window.onTelegramAuth = (user: TelegramUserPayload) => {
      onAuth(user);
    };

    if (!cleanBotName) return;

    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', cleanBotName);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', cornerRadius.toString());
    script.setAttribute('data-request-access', requestAccess);
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    if (!showAvatar) {
      script.setAttribute('data-userpic', 'false');
    }

    script.onload = () => setLoaded(true);

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [cleanBotName, buttonSize, cornerRadius, requestAccess, showAvatar, onAuth]);

  if (!cleanBotName) {
    return (
      <div className={`text-xs text-secondary/70 italic border border-secondary/20 p-3 text-center ${className}`}>
        Telegram Bot username missing (Set <code className="text-primary font-mono font-normal">VITE_TELEGRAM_BOT_NAME</code> in .env)
      </div>
    );
  }

  return (
    <div className={`flex justify-center min-h-[40px] items-center ${className}`}>
      <div ref={containerRef} />
      {!loaded && (
        <span className="text-xs text-secondary animate-pulse">Loading Telegram Login…</span>
      )}
    </div>
  );
}
