import { FunctionsHttpError } from '@supabase/supabase-js';
import { runStrictTextValidation, runTextPreflight } from '@/lib/pow/textPreflight';
import { analyzeImageSanity } from '@/lib/pow/imageSanity';
import { shrinkImageDataUrl } from '@/lib/pow/shrinkImage';
import { parsePowResponse } from '@/lib/pow/parsePowResponse';
import { isNativeApp } from '@/lib/platform/native';
import { supabase } from '@/lib/supabase';
import type { PowValidationResult } from '@/types/session';

export interface ValidatePowParams {
  taskPrompt: string;
  verificationMethod: 'text_input' | 'camera_upload';
  text?: string;
  imageBase64?: string;
}

export async function validateProofOfWork(
  params: ValidatePowParams,
): Promise<PowValidationResult> {
  if (params.verificationMethod === 'text_input') {
    const pre = runTextPreflight(params.text ?? '', params.taskPrompt);
    if (!pre.ok) return { isValid: false, reason: pre.reason };
    return invokePowEdgeFunction({
      mode: 'text',
      taskPrompt: params.taskPrompt,
      text: params.text ?? '',
    });
  }

  if (!params.imageBase64) {
    return { isValid: false, reason: 'No image provided.' };
  }

  const sanity = await analyzeImageSanity(params.imageBase64);
  if (!sanity.ok) return { isValid: false, reason: sanity.reason };

  let imageBase64 = params.imageBase64;
  if (imageBase64.length > 350_000) {
    try {
      imageBase64 = await shrinkImageDataUrl(imageBase64);
    } catch {
      return { isValid: false, reason: 'Could not process image. Try another photo.' };
    }
  }

  return invokePowEdgeFunction({
    mode: 'image',
    taskPrompt: params.taskPrompt,
    imageBase64,
  });
}

async function ensureAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('getSession', error.message);
    return null;
  }
  return data.session?.access_token ?? null;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, timeoutError: Error): Promise<T> {
  let timerId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => reject(timeoutError), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timerId) clearTimeout(timerId);
  }
}

async function invokePowEdgeFunction(
  body: Record<string, string>,
): Promise<PowValidationResult> {
  const token = await ensureAccessToken();
  if (!token) {
    return {
      isValid: false,
      reason: 'You must be signed in for AI validation.',
      debug: 'no_auth_session',
    };
  }

  try {
    const validationPromise = (async () => {
      const viaSdk = await trySdkInvoke(body);
      if (viaSdk.result) return viaSdk.result;
      if (viaSdk.result === null && viaSdk.handled) {
        return { isValid: false, reason: viaSdk.reason ?? 'Validation failed.', debug: viaSdk.debug };
      }

      const viaFetch = await tryFetchInvoke(body, token);
      if (viaFetch.result) return viaFetch.result;

      return fallbackWhenAiUnavailable(body, viaSdk.debug ?? viaFetch.debug);
    })();

    const timeoutError = new Error('AI validation request timed out.');
    return await withTimeout(validationPromise, 5000, timeoutError);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const isTimeout = errorMsg.includes('timed out');
    console.warn('validate-pow failed/timed out, triggering offline fallback:', errorMsg);

    return {
      isValid: false,
      isOffline: true,
      reason: 'Our AI helper is currently offline. We trust your efforts.',
      debug: isTimeout ? 'timeout_5s' : `exception:${errorMsg.slice(0, 100)}`,
    };
  }
}

async function trySdkInvoke(body: Record<string, string>): Promise<{
  result: PowValidationResult | null;
  handled: boolean;
  reason?: string;
  debug?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('validate-pow', { body });

    if (error) {
      const debug = await formatFunctionError(error);
      console.warn('validate-pow SDK error', debug);
      return { result: null, handled: false, debug };
    }

    const parsed = parsePowResponse(data);
    if (parsed) return { result: parsed, handled: true };

    return {
      result: null,
      handled: false,
      debug: `unexpected_response:${JSON.stringify(data)?.slice(0, 200)}`,
    };
  } catch (err) {
    const debug = err instanceof Error ? err.message : String(err);
    console.warn('validate-pow SDK exception', debug);
    return { result: null, handled: false, debug };
  }
}

async function tryFetchInvoke(
  body: Record<string, string>,
  accessToken: string,
): Promise<{ result: PowValidationResult | null; debug?: string }> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) {
    return { result: null, debug: 'missing_env:supabase_url_or_anon_key' };
  }

  try {
    const res = await fetch(`${baseUrl}/functions/v1/validate-pow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (!res.ok) {
      const debug = `http_${res.status}:${text.slice(0, 280)}`;
      console.warn('validate-pow fetch error', debug);
      return { result: null, debug };
    }

    const parsed = parsePowResponse(json);
    if (parsed) return { result: parsed };

    return { result: null, debug: `http_200_invalid_body:${text.slice(0, 200)}` };
  } catch (err) {
    const debug = `fetch_failed:${err instanceof Error ? err.message : String(err)}`;
    console.warn('validate-pow fetch exception', debug);
    return { result: null, debug };
  }
}

async function formatFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      return `http_${error.context.status}:${JSON.stringify(body)}`;
    } catch {
      return `http_${error.context.status}:${error.message}`;
    }
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

function fallbackWhenAiUnavailable(
  body: Record<string, string>,
  debug?: string,
): PowValidationResult {
  const debugSuffix = debug ? ` Details: ${debug}` : '';

  const isNetworkFailure = debug ? (
    debug.includes('fetch_failed') ||
    debug.includes('Failed to fetch') ||
    debug.includes('TypeError') ||
    debug.includes('network')
  ) : false;

  if (isNetworkFailure) {
    return {
      isValid: false,
      isOffline: true,
      reason: 'Our AI helper is currently offline. We trust your efforts.',
      debug,
    };
  }

  if (body.mode === 'text') {
    const strict = runStrictTextValidation(body.text ?? '', body.taskPrompt ?? '');
    if (!strict.ok) return { isValid: false, reason: strict.reason, debug };

    const hint = interpretDebug(debug);
    return {
      isValid: false,
      reason: hint ?? `AI validation failed.${debugSuffix}`,
      debug,
    };
  }

  const hint = interpretDebug(debug);
  return {
    isValid: false,
    reason: hint ?? `Photo could not be verified by AI.${debugSuffix}`,
    debug,
  };
}

function interpretDebug(debug?: string): string | null {
  if (!debug) return null;
  if (debug.includes('404') || debug.includes('NOT_FOUND')) {
    return 'validate-pow function not deployed. Run: supabase functions deploy validate-pow';
  }
  if (debug.includes('401') || debug.includes('403')) {
    return 'Auth rejected by server. Sign out and sign in again.';
  }
  if (debug.includes('OPENROUTER') || debug.includes('502')) {
    return 'AI service misconfigured. Set OPENROUTER_API_KEY in Supabase secrets.';
  }
  if (debug.includes('fetch_failed') || debug.includes('Failed to fetch')) {
    return 'Network request blocked. Check Android permissions and Supabase URL in build.';
  }
  if (debug.includes('missing_env')) {
    return 'App missing Supabase URL/key. Rebuild after setting .env.local.';
  }
  if (isNativeApp()) {
    return `AI validation error.${debug ? ` (${debug.slice(0, 120)})` : ''}`;
  }
  return null;
}
