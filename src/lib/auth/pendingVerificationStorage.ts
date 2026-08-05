const STORAGE_KEY = 'qum:pending_verification';
const PASSWORD_KEY = 'qum:pending_verification_pw';

export interface StoredPendingVerification {
  email: string;
}

export function readPendingVerification(): StoredPendingVerification | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPendingVerification;
    if (typeof parsed.email !== 'string' || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePendingVerification(data: StoredPendingVerification, password?: string): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  if (password) sessionStorage.setItem(PASSWORD_KEY, password);
}

export function readPendingPassword(): string {
  return sessionStorage.getItem(PASSWORD_KEY) ?? '';
}

export function clearPendingVerificationStorage(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(PASSWORD_KEY);
}

const VERIFIED_EMAIL_KEY = 'qum:verified_email_sign_in';

export function readVerifiedEmailForSignIn(): string | null {
  return sessionStorage.getItem(VERIFIED_EMAIL_KEY);
}

export function writeVerifiedEmailForSignIn(email: string): void {
  sessionStorage.setItem(VERIFIED_EMAIL_KEY, email);
}

export function clearVerifiedEmailForSignIn(): void {
  sessionStorage.removeItem(VERIFIED_EMAIL_KEY);
}
