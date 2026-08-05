# Telemetry audit

All events go through `trackEvent()` in `src/services/telemetryService.ts`. Today they log to the console in development only — no third-party analytics pipeline.

## Events

| Event | Properties | Sensitive data |
|-------|------------|----------------|
| `reflection_prompt_fired` | `wave_id` | No reflection text |
| `reflection_opened` | `mode` | No |
| `reflection_submitted` | `mode`, `skipped_field_count` | No free-text |
| `phase1_modality_selected` | `modality`, optional `had_active_commitment` | No |
| `phase1_task_selected` | `category`, `modality`, `difficulty_tier`, `task_id_hash` | No |
| `stillness_step_skipped` | `step_index`, `percent_elapsed` | No |
| `phase2_choice_made` | `option`, `had_alternatives_count` | No |
| `exit_check_started` | — | No |
| `exit_check_rating` | `rating` (0–10) | No |
| `exit_check_returned_to_phase2` | `rating` | No |
| `exit_check_completed_early` | `rating` | No |
| `letter_created` / `letter_updated` | `character_count` | **Never** letter body |
| `letter_surfaced_in_wave` | `character_count`, optional `had_active_commitment` | **Never** letter body |
| `letter_skipped_in_onboarding` | — | No |
| `letter_starter_shown` | — | No |
| `letter_starter_picked` | `prompt_index` (0–7) | **Never** prompt or letter text |
| `letter_starter_hidden` | — | No |
| `brief_opened` | `source` (`settings` \| `home` \| `onboarding`) | No brief body text |
| `voice_memo_recorded` | `duration_ms` | **Never** storage path or audio |
| `voice_memo_skipped` | — | No |
| `voice_memo_surfaced_in_wave` | optional `had_active_commitment` | **Never** path or audio |
| `commitment_created` | `hours` | No pledge text |
| `commitment_broken_manual` | `duration_remaining_ms` | No pledge text |
| `commitment_completed_honored` | `duration_total_ms` | No pledge text |
| `wave_started` | `had_active_commitment` | No |
| `wave_completed` | `had_active_commitment`, optional `completion_mode` (`full` \| `early_exit`) | No |
| `wave_failed` | `had_active_commitment`, `reason` | No |
| `onboarding_addiction_selected` | `addiction_type` | No free-text “other” value |
| `victory_artifact_shown` | `artifact_type` | No artifact content |
| `calm_hour_started` | — | No notes |
| `calm_hour_completed` | step flags | No notes body |
| `calm_hour_step_skipped` | `step` | No |
| `solidarity_card_tapped` | — | No |
| `crisis_card_shown` | `severity` | **Never** distress phrases or signal details |
| `crisis_action_tapped` | `action`, `surface`, optional `hotline_id` | No reflection content |

## Rules

- Do not add properties that contain letter bodies, reflection free-text, voice memo paths, or crisis phrase matches.
- Crisis detection runs client-side only; it is not emitted as telemetry.
- `had_active_commitment` on wave events is the only cross-correlation between waves and commitments.
