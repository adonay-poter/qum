import { supabase } from '@/lib/supabase';

export interface TelegramAuthSessionTokens {
  access_token: string;
  refresh_token: string;
}

/** Generates a unique telegram auth session code and creates a pending row in DB */
export async function createTelegramAuthSession(): Promise<string | null> {
  const sessionCode =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  const { error } = await supabase
    .from('telegram_auth_sessions')
    .insert({
      session_code: sessionCode,
      status: 'pending',
    });

  if (error) {
    console.error('Error creating telegram auth session:', error);
    return null;
  }

  return sessionCode;
}

/**
 * Subscribes via Realtime (and fallback polling) to watch for session approval.
 * Triggers callback when status changes to 'approved'.
 */
export function subscribeToTelegramAuthSession(
  sessionCode: string,
  onApproved: (tokens: TelegramAuthSessionTokens) => void
): () => void {
  let isDone = false;

  const handleApproval = (tokens: TelegramAuthSessionTokens) => {
    if (isDone) return;
    isDone = true;
    cleanup();
    onApproved(tokens);
  };

  // 1. Supabase Realtime Subscription
  const channel = supabase
    .channel(`telegram-auth-${sessionCode}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'telegram_auth_sessions',
        filter: `session_code=eq.${sessionCode}`,
      },
      (payload) => {
        const row = payload.new as {
          status: string;
          access_token?: string;
          refresh_token?: string;
        };
        if (row?.status === 'approved' && row.access_token && row.refresh_token) {
          handleApproval({
            access_token: row.access_token,
            refresh_token: row.refresh_token,
          });
        }
      }
    )
    .subscribe();

  // 2. Fallback Polling every 2 seconds (in case WebSocket reconnects on mobile)
  const pollInterval = setInterval(async () => {
    if (isDone) return;
    const { data } = await supabase
      .from('telegram_auth_sessions')
      .select('status, access_token, refresh_token')
      .eq('session_code', sessionCode)
      .maybeSingle();

    if (data?.status === 'approved' && data.access_token && data.refresh_token) {
      handleApproval({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
    }
  }, 2000);

  const cleanup = () => {
    isDone = true;
    clearInterval(pollInterval);
    void supabase.removeChannel(channel);
  };

  return cleanup;
}
