/** Event catalog and privacy rules: docs/TELEMETRY.md */
type TelemetryEvent =
  | 'reflection_prompt_fired'
  | 'reflection_opened'
  | 'reflection_submitted'
  | 'phase1_modality_selected'
  | 'phase1_task_selected'
  | 'stillness_step_skipped'
  | 'phase2_choice_made'
  | 'exit_check_started'
  | 'exit_check_rating'
  | 'exit_check_returned_to_phase2'
  | 'exit_check_completed_early'
  | 'letter_created'
  | 'letter_updated'
  | 'letter_surfaced_in_wave'
  | 'commitment_created'
  | 'commitment_broken_manual'
  | 'commitment_completed_honored'
  | 'onboarding_addiction_selected'
  | 'voice_memo_recorded'
  | 'voice_memo_skipped'
  | 'letter_skipped_in_onboarding'
  | 'letter_starter_shown'
  | 'letter_starter_picked'
  | 'letter_starter_hidden'
  | 'brief_opened'
  | 'voice_memo_surfaced_in_wave'
  | 'victory_artifact_shown'
  | 'wave_started'
  | 'wave_completed'
  | 'wave_failed'
  | 'calm_hour_started'
  | 'calm_hour_completed'
  | 'calm_hour_step_skipped'
  | 'solidarity_card_tapped'
  | 'crisis_card_shown'
  | 'crisis_action_tapped';

export function trackEvent(
  name: TelemetryEvent,
  props?: Record<string, string | number | boolean | null>,
): void {
  if (import.meta.env.DEV) {
    console.info('[telemetry]', name, props ?? {});
  }
}
