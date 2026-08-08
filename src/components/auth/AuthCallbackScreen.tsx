import { useEffect, useState } from 'react';
import { Page } from '@/components/layout/Page';
import { BilingualLockup } from '@/design-system/identity';
import { supabase } from '@/lib/supabase';
import { clearAuthCallbackFromUrl } from '@/lib/auth/redirectUrl';
import { ensureProfile } from '@/services/profileService';
import {
  clearPendingVerificationStorage,
  writeVerifiedEmailForSignIn,
} from '@/lib/auth/pendingVerificationStorage';

type CallbackStatus = 'working' | 'confirmed' | 'error';

/**
 * Shown when the user opens the email confirmation link (lands on /auth/callback).
 * Supabase exchanges the token; we verify email confirmation and allow them to proceed smoothly.
 */
export function AuthCallbackScreen() {
  const [status, setStatus] = useState<CallbackStatus>('working');
  const [message, setMessage] = useState<string | null>(null);

  const handleProceed = () => {
    clearAuthCallbackFromUrl();
    window.location.href = window.location.origin;
  };

  useEffect(() => {
    let cancelled = false;

    const checkVerification = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (cancelled) return false;

      if (error) {
        setStatus('error');
        setMessage(error.message);
        return true;
      }

      const sessionUser = data.session?.user;
      if (sessionUser?.email_confirmed_at) {
        const email = sessionUser.email ?? '';
        void ensureProfile(sessionUser.id);
        clearPendingVerificationStorage();
        if (email) writeVerifiedEmailForSignIn(email);
        setStatus('confirmed');
        window.dispatchEvent(new Event('qum:auth-verified'));
        return true;
      }

      if (sessionUser) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed.user?.email_confirmed_at) {
          void ensureProfile(refreshed.user.id);
          clearPendingVerificationStorage();
          if (refreshed.user.email) writeVerifiedEmailForSignIn(refreshed.user.email);
          setStatus('confirmed');
          window.dispatchEvent(new Event('qum:auth-verified'));
          return true;
        }
      }

      return false;
    };

    const timeout = setTimeout(async () => {
      if (cancelled) return;
      const verified = await checkVerification();
      if (!verified && !cancelled) {
        setStatus('error');
        setMessage('We could not confirm your email. Try opening the link again.');
      }
    }, 3500);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (
        (event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED' ||
          event === 'INITIAL_SESSION') &&
        session?.user?.email_confirmed_at
      ) {
        clearTimeout(timeout);
        void checkVerification();
      }
    });

    void checkVerification().then((ok) => {
      if (ok) clearTimeout(timeout);
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <Page>
      <div className="flex min-h-full flex-col justify-center py-8">
        <BilingualLockup size="md" className="mb-8 items-start" />
        {status === 'working' && (
          <>
            <p className="text-label uppercase text-tertiary">Confirming</p>
            <h1 className="mt-qum-sm text-h1 text-primary">Verifying your email…</h1>
            <p className="mt-qum-md text-body text-secondary">This only takes a moment.</p>
          </>
        )}
        {status === 'confirmed' && (
          <>
            <p className="text-label uppercase text-tertiary">Email confirmed</p>
            <h1 className="mt-qum-sm text-h1 text-primary">You&apos;re verified</h1>
            <p className="mt-qum-md text-body text-secondary">
              Your email is confirmed. Tap below to start using QUM.
            </p>
            <button
              onClick={handleProceed}
              className="mt-qum-lg inline-block w-full bg-tertiary px-5 py-3 text-center text-body font-semibold text-on-primary"
            >
              Open QUM
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-label uppercase text-tertiary">Something went wrong</p>
            <h1 className="mt-qum-sm text-h1 text-primary">Could not verify</h1>
            {message && <p className="mt-qum-md text-body text-tertiary">{message}</p>}
            <button
              onClick={handleProceed}
              className="mt-qum-lg inline-block text-body text-secondary underline-offset-2 hover:underline"
            >
              Back to sign in
            </button>
          </>
        )}
      </div>
    </Page>
  );
}
