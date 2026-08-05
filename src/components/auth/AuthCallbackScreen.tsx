import { useEffect, useState } from 'react';
import { Page } from '@/components/layout/Page';
import { BilingualLockup } from '@/design-system/identity';
import { supabase } from '@/lib/supabase';
import { clearAuthCallbackFromUrl } from '@/lib/auth/redirectUrl';
import {
  clearPendingVerificationStorage,
  writeVerifiedEmailForSignIn,
} from '@/lib/auth/pendingVerificationStorage';

type CallbackStatus = 'working' | 'confirmed' | 'error';

/**
 * Shown when the user opens the email confirmation link (lands on /auth/callback).
 * Supabase exchanges the token; we sign out and send them to sign in with email prefilled.
 */
export function AuthCallbackScreen() {
  const [status, setStatus] = useState<CallbackStatus>('working');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (cancelled) return;

      if (error) {
        setStatus('error');
        setMessage(error.message);
        clearAuthCallbackFromUrl();
        return;
      }

      const sessionUser = data.session?.user;
      if (sessionUser?.email_confirmed_at) {
        const email = sessionUser.email ?? '';
        await supabase.auth.signOut();
        clearPendingVerificationStorage();
        if (email) writeVerifiedEmailForSignIn(email);
        clearAuthCallbackFromUrl();
        setStatus('confirmed');
        window.dispatchEvent(new Event('qum:auth-verified'));
        return;
      }

      setStatus('error');
      setMessage('We could not confirm your email. Try the link again or request a new one.');
      clearAuthCallbackFromUrl();
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        void finish();
      }
    });

    void finish();

    return () => {
      cancelled = true;
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
              Sign in with your password to open QUM.
            </p>
            <a
              href="./"
              className="mt-qum-lg inline-block w-full bg-tertiary px-5 py-3 text-center text-body font-semibold text-on-primary"
            >
              Continue to sign in
            </a>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-label uppercase text-tertiary">Something went wrong</p>
            <h1 className="mt-qum-sm text-h1 text-primary">Could not verify</h1>
            {message && <p className="mt-qum-md text-body text-tertiary">{message}</p>}
            <a
              href="./"
              className="mt-qum-lg inline-block text-body text-secondary underline-offset-2 hover:underline"
            >
              Back to sign in
            </a>
          </>
        )}
      </div>
    </Page>
  );
}
