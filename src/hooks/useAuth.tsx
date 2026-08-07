import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getAuthRedirectUrl } from '@/lib/auth/redirectUrl';
import {
  clearPendingVerificationStorage,
  clearVerifiedEmailForSignIn,
  readPendingPassword,
  readPendingVerification,
  readVerifiedEmailForSignIn,
  writePendingVerification,
  writeVerifiedEmailForSignIn,
  type StoredPendingVerification,
} from '@/lib/auth/pendingVerificationStorage';
import { refreshTaskCache } from '@/repositories/taskRepository';
import { ensureProfile } from '@/services/profileService';
import { secureSignOut } from '@/services/authService';
import { useWaveStore } from '@/stores/waveStore';
import { useProfileStore } from '@/stores/profileStore';
import { useCommitmentStore } from '@/stores/commitmentStore';

export type AuthGate = 'sign_in' | 'sign_up' | 'check_email';

export interface PendingVerification extends StoredPendingVerification {
  password: string;
}

function isEmailNotConfirmed(error: AuthError | null): boolean {
  if (!error) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('email not confirmed') ||
    msg.includes('email not verified') ||
    error.code === 'email_not_confirmed'
  );
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  authGate: AuthGate;
  pendingVerification: PendingVerification | null;
  verifiedEmailForSignIn: string | null;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null; needsVerification: boolean }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null; needsVerification: boolean }>;
  signOut: () => Promise<void>;
  resendVerificationEmail: () => Promise<{ error: AuthError | null }>;
  checkEmailConfirmed: (password: string) => Promise<{ error: AuthError | null; verified: boolean }>;
  openSignUp: () => void;
  openSignIn: () => void;
  cancelPendingVerification: () => void;
  dismissVerifiedBanner: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authGate, setAuthGate] = useState<AuthGate>('sign_in');
  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);
  const [verifiedEmailForSignIn, setVerifiedEmailForSignIn] = useState<string | null>(null);
  const setUserId = useWaveStore((s) => s.setUserId);

  const beginCheckEmail = useCallback((email: string, password: string) => {
    const pending: PendingVerification = { email, password };
    setPendingVerification(pending);
    writePendingVerification({ email }, password);
    setAuthGate('check_email');
  }, []);

  useEffect(() => {
    const stored = readPendingVerification();
    const verifiedEmail = readVerifiedEmailForSignIn();
    if (verifiedEmail) setVerifiedEmailForSignIn(verifiedEmail);
    if (stored) {
      setAuthGate('check_email');
      const pw = readPendingPassword();
      setPendingVerification((prev) => prev ?? { email: stored.email, password: pw });
    }

    const onVerified = () => {
      const email = readVerifiedEmailForSignIn();
      if (email) {
        setVerifiedEmailForSignIn(email);
        setPendingVerification(null);
        clearPendingVerificationStorage();
        setAuthGate('sign_in');
      }
    };
    window.addEventListener('qum:auth-verified', onVerified);

    const bootTimeout = setTimeout(() => {
      setLoading(false);
    }, 4000);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        clearTimeout(bootTimeout);
        setSession(data.session);
        const sessionUser = data.session?.user ?? null;
        setUser(sessionUser);
        setUserId(sessionUser?.id ?? null);
        if (sessionUser) {
          try {
            useProfileStore.getState().hydrate(sessionUser.id);
            useCommitmentStore.getState().hydrate(sessionUser.id);
            void useProfileStore.getState().loadProfile(sessionUser.id, { force: true });
            void useCommitmentStore.getState().load(sessionUser.id);
          } catch (err) {
            console.error('hydrate stores on boot', err);
            useCommitmentStore.getState().clear();
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('getSession boot error', err);
        clearTimeout(bootTimeout);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;
      setUser(nextUser);
      setUserId(nextUser?.id ?? null);
      if (nextUser) {
        setPendingVerification(null);
        clearPendingVerificationStorage();
        setAuthGate('sign_in');
        useProfileStore.getState().hydrate(nextUser.id);
        useCommitmentStore.getState().hydrate(nextUser.id);
        void ensureProfile(nextUser.id).then((profile) => {
          if (profile) useProfileStore.getState().setProfile(profile);
        });
        void useCommitmentStore.getState().load(nextUser.id);
        void refreshTaskCache();
      } else {
        useProfileStore.getState().clear();
        useCommitmentStore.getState().clear();
      }
    });

    return () => {
      window.removeEventListener('qum:auth-verified', onVerified);
      subscription.unsubscribe();
    };
  }, [setUserId]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (isEmailNotConfirmed(error)) {
        beginCheckEmail(email, password);
        return { error: null, needsVerification: true };
      }
      return { error, needsVerification: false };
    }

    if (data.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      beginCheckEmail(email, password);
      return { error: null, needsVerification: true };
    }

    clearVerifiedEmailForSignIn();
    setVerifiedEmailForSignIn(null);
    return { error: null, needsVerification: false };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: getAuthRedirectUrl() },
    });
    if (error) return { error, needsVerification: false };

    if (data.user && !data.session) {
      beginCheckEmail(email, password);
      return { error: null, needsVerification: true };
    }

    if (data.user && !data.user.email_confirmed_at && data.session) {
      await supabase.auth.signOut();
      beginCheckEmail(email, password);
      return { error: null, needsVerification: true };
    }

    return { error: null, needsVerification: false };
  };

  const resendVerificationEmail = async () => {
    if (!pendingVerification?.email) {
      return { error: new Error('No pending signup') as AuthError };
    }
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: pendingVerification.email,
      options: { emailRedirectTo: getAuthRedirectUrl() },
    });
    return { error };
  };

  const checkEmailConfirmed = async (password: string) => {
    if (!pendingVerification?.email) {
      return { error: new Error('No pending signup') as AuthError, verified: false };
    }

    const email = pendingVerification.email;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (isEmailNotConfirmed(error)) {
        return {
          error: {
            message:
              'Not confirmed yet. Open your mail app, tap the link we sent, then try again.',
          } as AuthError,
          verified: false,
        };
      }
      return { error, verified: false };
    }

    if (!data.user?.email_confirmed_at) {
      await supabase.auth.signOut();
      return {
        error: {
          message:
            'Not confirmed yet. Open your mail app, tap the link we sent, then try again.',
        } as AuthError,
        verified: false,
      };
    }

    await supabase.auth.signOut();
    clearPendingVerificationStorage();
    setPendingVerification(null);
    writeVerifiedEmailForSignIn(email);
    setVerifiedEmailForSignIn(email);
    setAuthGate('sign_in');
    return { error: null, verified: true };
  };

  const cancelPendingVerification = () => {
    setPendingVerification(null);
    clearPendingVerificationStorage();
    setAuthGate('sign_in');
  };

  const openSignUp = () => {
    setAuthGate('sign_up');
  };

  const openSignIn = () => {
    setAuthGate('sign_in');
  };

  const dismissVerifiedBanner = () => {
    clearVerifiedEmailForSignIn();
    setVerifiedEmailForSignIn(null);
  };

  const value: AuthContextValue = {
    session,
    user,
    loading,
    authGate,
    pendingVerification,
    verifiedEmailForSignIn,
    signIn,
    signUp,
    signOut: secureSignOut,
    resendVerificationEmail,
    checkEmailConfirmed,
    openSignUp,
    openSignIn,
    cancelPendingVerification,
    dismissVerifiedBanner,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
