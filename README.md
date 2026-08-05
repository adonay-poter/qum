# Arch

Anti-addiction surf sessions: React + Supabase + Zustand state machine.

**Product docs:** [Features & flows](docs/FEATURES_AND_FLOWS.md)

## Setup

1. Copy `.env.example` → `.env.local` and add your Supabase URL + anon key.
2. **Supabase → Authentication → URL Configuration → Redirect URLs** — add:
   - Web dev: `http://localhost:5173/auth/callback`
   - **Android app:** `com.arch.surf://auth/callback` (opens the installed app from the confirmation email; not `https://localhost`)
3. Apply the migration in `supabase/migrations/20260517000000_initial_schema.sql` (Supabase SQL editor or `supabase db push`).
4. Install and run:

```bash
npm install
npm run dev
```

## Advanced mechanics


| Feature                              | Module                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------- |
| **PoW validation (Gemma 4)**         | `supabase/functions/validate-pow` + `src/services/powValidationService.ts` |
| **Rage-quit anti-cheat**             | `src/lib/storage/sessionLock.ts`, `src/hooks/useSessionLockGuard.ts`       |
| **Offline task cache + sync queue**  | `src/repositories/taskRepository.ts`, `src/services/syncQueueService.ts`   |
| **Resilience-based task difficulty** | `src/lib/tasks/difficultySelector.ts`                                      |
| **Predictive urge warnings**         | `src/hooks/usePredictiveUrgeWarnings.ts`                                   |


### Deploy PoW edge function

```bash
# Set secret in Supabase (never commit the key):
# supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...

supabase functions deploy validate-pow
```

### Migrations

Run both SQL files in order in the Supabase SQL editor:

1. `supabase/migrations/20260517000000_initial_schema.sql`
2. `supabase/migrations/20260517120000_difficulty_tier.sql`

## Fast phase testing

Add to `.env.local`:

```
VITE_DEV_FAST_WAVE=true
```

This compresses the 10-minute session to **30 seconds** (9s / 15s / 6s phases).

## Wave state machine


| Mode                | Trigger                                                              |
| ------------------- | -------------------------------------------------------------------- |
| `IDLE`              | Home — press **Urge**                                                |
| `PHASE_1_CHOICE`    | Pick Body, Cold, or Stillness                                        |
| `PHASE_1`           | Modality flow (body taps, cold 90s, or 5-4-3-2-1 grounding)          |
| `PHASE_2`           | Random `cognitive` task + camera or text proof                       |
| `PHASE_3`           | 60s unskippable breathing timer                                      |
| `VICTORY`           | Global timer hits 0 → `complete_wave` RPC                            |
| Failure (rage-quit) | App closed mid-wave → `fail_wave` logs session; resilience unchanged |


Core modules: `src/stores/waveStore.ts`, `src/hooks/useWaveTimer.ts`, `src/services/`*.

## Android app (Capacitor)

Native plugins wired:


| Capability             | Plugin                           | Code                                  |
| ---------------------- | -------------------------------- | ------------------------------------- |
| Camera proof           | `@capacitor/camera`              | `src/services/cameraService.ts`       |
| Urge warnings          | `@capacitor/local-notifications` | `src/services/notificationService.ts` |
| Offline storage        | `@capacitor/preferences`         | `src/lib/storage/appStorage.ts`       |
| App resume (rage-quit) | `@capacitor/app`                 | `src/main.tsx`                        |


### Build APK on your machine

**Requirements:** Node 20+, Android Studio, JDK 17.

```bash
npm install
npm run build

    # first time only
npx cap sync android
npx cap open android   # Run ▶ in Android Studio on device/emulator
```

Or one command after the first setup:

```bash
npm run android
```

`.env.local` is bundled at build time — set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` before `npm run build`. After changing auth redirect settings, run `npm run build && npx cap sync android` so the APK uses the deep link `com.arch.surf://auth/callback` in signup emails.

### Android permissions

Capacitor adds `CAMERA` and notification permissions automatically. Grant them when prompted on first use.