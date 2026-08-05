# Manual QA checklist (pre-ship)

## Fresh install paths

- [ ] **Full onboarding** → addiction type, voice memo (or skip), letter (or skip), permissions → lands on Home → first wave completes to Victory
- [ ] **Skip optional steps** → skip voice memo, skip letter, skip permissions → app still usable; wave can start and complete

## Wave & resilience

- [ ] **Wave failure** — close app mid-wave → resume: neutral toast (“Resilience held steady”), supportive overlay, **no** resilience drop
- [ ] **Delayed reflection** — after failure, local notification ~5h later (or adjust clock); tap opens Reflection with wave linked; all fields skippable
- [ ] **Inactive user** — no events in 30 days: resilience holds steady (no decay); subtitle absent in 40–74 band
- [ ] **Resilience breakdown** — “What goes into this?” shows 30-day components; totals match modeled score

## Commitments

- [ ] **Active commitment** → Urge → goes straight to phase 1 choice (no gate)
- [ ] **Victory with commitment** → shows cooperative copy + quoted pledge above rewards
- [ ] **I broke this commitment** → honored=false, break screen, no penalty
- [ ] **Expiry** → honored=true toast on next Home open (one-time)

## Crisis & support

- [ ] **Distress signals** — simulate 5+ failed waves in 48h (or 3 failure-only days) → support card appears below resilience; “Not now” hides 48h
- [ ] **Find support** — Settings → hotlines list; call/web links work on device

## Calm hour & solidarity

- [ ] **Calm-hour notification** — fires once per ISO week; tap opens CalmHourScreen
- [ ] **Calm-hour settings** — Settings → change day/time → save → notification reschedules
- [ ] **Solidarity card** — counts update when waves start/end; offline shows last cached values

## Settings hub

- [ ] **Settings** — Account menu → edit letter, voice memo, reflection history, calm-hour, find support, sign out all reachable

## Accessibility spot-check

- [ ] VoiceOver / TalkBack: Urge button, Stillness step progress, voice memo “your own recording” label
- [ ] Buttons with icon-only or terse labels have `aria-label`
