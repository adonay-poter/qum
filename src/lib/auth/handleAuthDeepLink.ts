import { supabase } from '@/lib/supabase';
import { getAuthDeepLinkUrl } from '@/config/appIdentity';
import {
  clearPendingVerificationStorage,
  writeVerifiedEmailForSignIn,
} from '@/lib/auth/pendingVerificationStorage';

export interface AuthDeepLinkResult {
  ok: boolean;
  error?: string;
}

/** Parse com.arch.surf://auth/callback?code=… or #access_token=… */
function parseAuthParams(url: string): { code: string | null; accessToken: string | null; refreshToken: string | null } {
  const deepLinkPrefix = getAuthDeepLinkUrl();
  let query = '';
  let hash = '';

  if (url.startsWith(deepLinkPrefix)) {
    const rest = url.slice(deepLinkPrefix.length);
    const hashIdx = rest.indexOf('#');
    const qIdx = rest.indexOf('?');
    if (hashIdx >= 0) {
      hash = rest.slice(hashIdx + 1);
      query = qIdx >= 0 && qIdx < hashIdx ? rest.slice(qIdx + 1, hashIdx) : '';
    } else if (qIdx >= 0) {
      query = rest.slice(qIdx + 1);
    }
  } else {
    try {
      const parsed = new URL(url);
      query = parsed.search.startsWith('?') ? parsed.search.slice(1) : parsed.search;
      hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
    } catch {
      return { code: null, accessToken: null, refreshToken: null };
    }
  }

  const search = new URLSearchParams(query);
  const hashParams = new URLSearchParams(hash);

  return {
    code: search.get('code') ?? hashParams.get('code'),
    accessToken: hashParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token'),
  };
}

export function isAuthDeepLinkUrl(url: string): boolean {
  const prefix = getAuthDeepLinkUrl();
  return url.startsWith(prefix) || url.includes('/auth/callback');
}

/**
 * Complete email confirmation when the app is opened via a deep link (Android/iOS).
 */
export async function handleAuthDeepLink(url: string): Promise<AuthDeepLinkResult> {
  if (!isAuthDeepLinkUrl(url)) {
    return { ok: false, error: 'Not an auth callback link' };
  }

  const { code, accessToken, refreshToken } = parseAuthParams(url);

  try {
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return { ok: false, error: error.message };
      if (!data.session?.user?.email_confirmed_at) {
        await supabase.auth.signOut();
        return { ok: false, error: 'Email not confirmed yet' };
      }
    } else if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) return { ok: false, error: error.message };
      if (!data.session?.user?.email_confirmed_at) {
        await supabase.auth.signOut();
        return { ok: false, error: 'Email not confirmed yet' };
      }
    } else {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user?.email_confirmed_at) {
        return { ok: false, error: 'Missing confirmation code in link' };
      }
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const email = sessionData.session?.user?.email ?? '';

    await supabase.auth.signOut();
    clearPendingVerificationStorage();
    if (email) writeVerifiedEmailForSignIn(email);
    window.dispatchEvent(new Event('qum:auth-verified'));

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not complete sign-in from link';
    return { ok: false, error: message };
  }
}
