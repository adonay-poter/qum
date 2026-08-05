import { useEffect, useState } from 'react';
import { Page } from '@/components/layout/Page';
import { BilingualLockup } from '@/design-system/identity';
import { useAuth } from '@/hooks/useAuth';

export function CheckEmailScreen() {
  const {
    pendingVerification,
    checkEmailConfirmed,
    resendVerificationEmail,
    cancelPendingVerification,
    openSignIn,
  } = useAuth();
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (pendingVerification?.password) {
      setPassword(pendingVerification.password);
    }
  }, [pendingVerification?.email, pendingVerification?.password]);
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const email = pendingVerification?.email ?? '';

  const handleChecked = async () => {
    if (!password.trim()) {
      setError('Enter the password you used when creating your account.');
      return;
    }

    setChecking(true);
    setError(null);
    const { error: checkError, verified } = await checkEmailConfirmed(password);
    setChecking(false);

    if (verified) return;

    setError(
      checkError?.message ??
        'Not confirmed yet. Open your mail app, tap the link we sent, then try again.',
    );
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setResent(false);
    const { error: resendError } = await resendVerificationEmail();
    setResending(false);
    if (resendError) {
      setError(resendError.message);
      return;
    }
    setResent(true);
  };

  return (
    <Page>
      <div className="flex min-h-full flex-col justify-center py-8">
        <BilingualLockup size="md" className="mb-8 items-start" />
        <p className="text-label uppercase text-tertiary">Almost there</p>
        <h1 className="mt-qum-sm text-h1 text-primary">Check your mail app</h1>
        <p className="mt-qum-md max-w-md text-body text-secondary">
          We sent a confirmation link to{' '}
          <span className="font-medium text-primary">{email || 'your email'}</span>. Open your mail
          app, tap the link, then come back here.
        </p>

        <ol className="mt-qum-lg space-y-3 text-body text-secondary">
          <li className="flex gap-3">
            <span className="text-tertiary">1.</span>
            <span>Open Gmail, Outlook, or your mail app</span>
          </li>
          <li className="flex gap-3">
            <span className="text-tertiary">2.</span>
            <span>Find the email from QUM and tap the confirmation link</span>
          </li>
          <li className="flex gap-3">
            <span className="text-tertiary">3.</span>
            <span>Return here and tap the button below</span>
          </li>
        </ol>

        <label className="mt-qum-lg flex flex-col gap-qum-sm">
          <span className="text-label uppercase text-secondary">Your password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Same password you just created"
            className="border border-secondary/40 bg-surface px-qum-md py-3 text-body text-primary outline-none focus:border-tertiary"
          />
        </label>

        {error && <p className="mt-qum-md text-body text-tertiary">{error}</p>}
        {resent && (
          <p className="mt-qum-md text-body text-primary">We sent another confirmation email.</p>
        )}

        <button
          type="button"
          disabled={checking}
          onClick={() => void handleChecked()}
          className="mt-qum-lg w-full bg-tertiary px-5 py-3 text-body font-semibold text-on-primary disabled:opacity-50"
        >
          {checking ? 'Checking…' : "I've checked my email"}
        </button>

        <button
          type="button"
          disabled={resending}
          onClick={() => void handleResend()}
          className="mt-qum-md w-full border border-secondary/30 py-3 text-body text-secondary disabled:opacity-50"
        >
          {resending ? 'Sending…' : 'Resend confirmation email'}
        </button>

        <button
          type="button"
          onClick={() => {
            cancelPendingVerification();
            openSignIn();
          }}
          className="mt-qum-md text-left text-body text-secondary underline-offset-2 hover:underline"
        >
          Use a different email
        </button>
      </div>
    </Page>
  );
}
