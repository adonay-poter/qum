import { useEffect, useState, type FormEvent } from 'react';
import { Page } from '@/components/layout/Page';
import { BilingualLockup } from '@/design-system/identity';
import { useAuth } from '@/hooks/useAuth';
import { TelegramLoginButton } from '@/components/auth/TelegramLoginButton';
import type { TelegramUserPayload } from '@/services/authService';

export function AuthScreen() {
  const {
    signIn,
    signInWithTelegram,
    openSignUp,
    verifiedEmailForSignIn,
    dismissVerifiedBanner,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (verifiedEmailForSignIn) {
      setEmail(verifiedEmailForSignIn);
    }
  }, [verifiedEmailForSignIn]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const result = await signIn(email, password);

    if (result.needsVerification) {
      setBusy(false);
      return;
    }

    if (result.error) setError(result.error.message);
    else dismissVerifiedBanner();
    setBusy(false);
  };

  const handleTelegramAuth = async (telegramUser: TelegramUserPayload) => {
    setBusy(true);
    setError(null);

    const result = await signInWithTelegram(telegramUser);
    if (result.error) {
      setError(result.error.message);
    } else {
      dismissVerifiedBanner();
    }
    setBusy(false);
  };

  return (
    <Page>
      <div className="flex flex-col justify-center py-8">
        <BilingualLockup size="md" className="items-start" />
        <h1 className="mt-qum-lg text-h1 text-primary">Break the loop</h1>
        <p className="mt-qum-md max-w-sm text-body text-secondary">
          Ten minutes. Three phases. One urge at a time.
        </p>

        {verifiedEmailForSignIn && (
          <p className="mt-qum-md border border-tertiary/40 bg-surface px-qum-md py-3 text-body text-primary">
            Your email is confirmed. Sign in to continue.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-qum-lg flex flex-col gap-qum-md">
          <label className="flex flex-col gap-qum-sm">
            <span className="text-label uppercase text-secondary">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-secondary/40 bg-surface px-qum-md py-3 text-body text-primary outline-none focus:border-tertiary"
            />
          </label>
          <label className="flex flex-col gap-qum-sm">
            <span className="text-label uppercase text-secondary">Password</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-secondary/40 bg-surface px-qum-md py-3 text-body text-primary outline-none focus:border-tertiary"
            />
          </label>

          {error && <p className="text-body text-tertiary">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="bg-tertiary px-5 py-3 text-body font-semibold text-on-primary disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-qum-lg flex items-center gap-qum-sm">
          <div className="h-px flex-1 bg-secondary/30" />
          <span className="text-xs uppercase text-secondary/70 tracking-wider">or continue with</span>
          <div className="h-px flex-1 bg-secondary/30" />
        </div>

        <div className="mt-qum-md">
          <TelegramLoginButton onAuth={handleTelegramAuth} />
        </div>

        <button
          type="button"
          onClick={openSignUp}
          className="mt-qum-md text-left text-body text-secondary underline-offset-2 hover:underline"
        >
          New here? Create account
        </button>
      </div>
    </Page>
  );
}
