import { getAuthDeepLinkUrl } from '@/config/appIdentity';
import { isNativeApp } from '@/lib/platform/native';

/**
 * Where Supabase sends users after they tap the confirmation link in email.
 * Must match Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.
 *
 * - Web dev: http://localhost:5173/auth/callback
 * - Android/iOS: com.arch.surf://auth/callback (opens the installed app, not a browser tab)
 */
export function getAuthRedirectUrl(): string {
  const configured = import.meta.env.VITE_AUTH_REDIRECT_URL?.trim();
  if (configured) return configured;

  if (isNativeApp()) {
    return getAuthDeepLinkUrl();
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }

  return getAuthDeepLinkUrl();
}

export function isAuthCallbackRoute(): boolean {
  if (typeof window === 'undefined') return false;

  const path = window.location.pathname.replace(/\/$/, '');
  if (path.endsWith('/auth/callback')) return true;

  const hash = window.location.hash;
  if (hash.includes('access_token=') || hash.includes('type=signup')) return true;

  const params = new URLSearchParams(window.location.search);
  return params.has('code');
}

export function clearAuthCallbackFromUrl(): void {
  if (typeof window === 'undefined') return;

  const cleanPath = window.location.pathname.replace(/\/auth\/callback\/?$/, '') || '/';
  try {
    const url = new URL(window.location.href);
    url.pathname = cleanPath;
    url.search = '';
    url.hash = '';
    window.history.replaceState({}, document.title, url.toString());
  } catch {
    window.history.replaceState({}, document.title, cleanPath);
  }
}
