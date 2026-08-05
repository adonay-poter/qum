-- Phase 1 Stillness & Cold: task pool schema + mindful/cold seed tasks

-- 1. Extend category to include cold
alter table public.tasks drop constraint if exists tasks_category_check;
alter table public.tasks
  add constraint tasks_category_check
  check (category in ('physical', 'cognitive', 'mindful', 'cold'));

-- 2. New columns
alter table public.tasks
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists modality text,
  add column if not exists step_data jsonb,
  add column if not exists duration_sec int check (duration_sec is null or duration_sec > 0),
  add column if not exists safety_note text,
  add column if not exists requires_outdoor boolean not null default false,
  add column if not exists enabled boolean not null default true;

-- 3. step_data step durations must sum to duration_sec when both are set
create or replace function public.tasks_step_duration_matches()
returns trigger
language plpgsql
as $$
declare
  step_sum int;
begin
  if new.step_data is null then
    return new;
  end if;

  select coalesce(sum((s->>'duration_sec')::int), 0)
  into step_sum
  from jsonb_array_elements(new.step_data->'steps') as s;

  if new.duration_sec is not null and step_sum <> new.duration_sec then
    raise exception 'tasks.duration_sec (%) must equal sum of step_data step durations (%)',
      new.duration_sec, step_sum;
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_step_duration_check on public.tasks;
create trigger tasks_step_duration_check
  before insert or update on public.tasks
  for each row execute function public.tasks_step_duration_matches();

-- 4. Mindful tasks (15+)
insert into public.tasks (
  category, title, description, prompt_text, verification_method, tap_target,
  difficulty_tier, modality, step_data, duration_sec, safety_note, requires_outdoor, enabled
) values
  (
    'mindful', '5-4-3-2-1 grounding', 'Classic sensory grounding when the urge is loud.',
    'Name 5 things you see, 4 you hear, 3 you feel, 2 you smell, 1 good thing now.',
    'tap_count', null, 'medium', 'grounding',
    '{"steps":[
      {"prompt":"Name 5 things you can SEE","duration_sec":30},
      {"prompt":"Name 4 things you can HEAR","duration_sec":24},
      {"prompt":"Name 3 things you can FEEL","duration_sec":18},
      {"prompt":"Name 2 things you can SMELL","duration_sec":12},
      {"prompt":"Name 1 good thing about right now","duration_sec":15}
    ]}'::jsonb,
    99, null, false, true
  ),
  (
    'mindful', '4-3-2-1 colors', 'Shape-based grounding — good when vision is your anchor.',
    'Four blue things, three round things, two textures, one sound.',
    'tap_count', null, 'medium', 'grounding',
    '{"steps":[
      {"prompt":"Name 4 blue things you can see","duration_sec":24},
      {"prompt":"Name 3 round things you can see","duration_sec":18},
      {"prompt":"Name 2 different textures you can feel","duration_sec":14},
      {"prompt":"Name 1 sound you can hear right now","duration_sec":12}
    ]}'::jsonb,
    68, null, false, true
  ),
  (
    'mindful', 'Body anchor', 'Bring attention down through the body, piece by piece.',
    'Feet, hands, jaw, shoulders — four anchors in sequence.',
    'tap_count', null, 'low', 'grounding',
    '{"steps":[
      {"prompt":"Feel your feet on the floor or surface beneath you","duration_sec":20},
      {"prompt":"Feel your hands — temperature, pressure, contact","duration_sec":20},
      {"prompt":"Notice your jaw — let it soften if it is clenched","duration_sec":20},
      {"prompt":"Drop your shoulders away from your ears","duration_sec":20}
    ]}'::jsonb,
    80, null, false, true
  ),
  (
    'mindful', 'Top-down body scan', 'Slow scan from head to feet — longer practice for high resilience.',
    'Move attention through six regions without rushing.',
    'tap_count', null, 'high', 'body_scan',
    '{"steps":[
      {"prompt":"Head and face — notice tension without fixing it","duration_sec":15},
      {"prompt":"Shoulders and upper back","duration_sec":15},
      {"prompt":"Chest and belly — notice breath movement","duration_sec":15},
      {"prompt":"Hands and arms","duration_sec":15},
      {"prompt":"Hips and legs","duration_sec":15},
      {"prompt":"Feet — contact with the ground","duration_sec":15}
    ]}'::jsonb,
    90, null, false, true
  ),
  (
    'mindful', 'Tension release', 'Clench and release each muscle group in order.',
    'Brief squeeze, then let go — notice the difference.',
    'tap_count', null, 'high', 'body_scan',
    '{"steps":[
      {"prompt":"Hands — clench fists 5 seconds, then release","duration_sec":18},
      {"prompt":"Arms — tense, hold, release","duration_sec":18},
      {"prompt":"Shoulders — lift toward ears, then drop","duration_sec":18},
      {"prompt":"Face — scrunch gently, then soften","duration_sec":18},
      {"prompt":"Core — gentle tighten, then release","duration_sec":18},
      {"prompt":"Legs — press feet down, then relax","duration_sec":18}
    ]}'::jsonb,
    108, null, false, true
  ),
  (
    'mindful', 'Ten breaths', 'Watch without changing — counting resets autopilot.',
    'Watch your next 10 breaths. Do not change them. Just count.',
    'tap_count', null, 'low', 'breath',
    null, 90, null, false, true
  ),
  (
    'mindful', 'Breath anchor spot', 'Find where breath feels strongest and stay there.',
    'Notice where you feel the breath strongest right now. Stay with that spot.',
    'tap_count', null, 'medium', 'breath',
    null, 90, null, false, true
  ),
  (
    'mindful', 'Safe place', 'Visualization for when you need emotional distance from the urge.',
    'Picture a place you felt completely safe. Stay there for two minutes.',
    'tap_count', null, 'high', 'visualization',
    null, 120, null, false, true
  ),
  (
    'mindful', 'Urge as weather', 'See the craving as weather passing through.',
    'Imagine the urge as weather — a storm passing. Watch it move.',
    'tap_count', null, 'medium', 'visualization',
    null, 90, null, false, true
  ),
  (
    'mindful', 'Noting thoughts', 'Label and release — reduces fusion with craving thoughts.',
    'Whatever thought comes, label it "thinking." Then let it go. Do this for 90 seconds.',
    'tap_count', null, 'medium', 'noting',
    null, 90, null, false, true
  ),
  (
    'mindful', 'Three sounds', 'Auditory noting from near to far.',
    'Notice three different sounds in this moment, near to far.',
    'tap_count', null, 'low', 'noting',
    null, 90, null, false, true
  ),
  (
    'mindful', 'One object study', 'Deep observation breaks visual craving loops.',
    'Pick one object in your line of sight. Describe it in detail for 90 seconds.',
    'tap_count', null, 'low', 'observation',
    null, 90, null, false, true
  ),
  (
    'mindful', 'Smallest detail', 'Hunt for something you have never noticed before.',
    'Find the smallest detail in the room you had not noticed before.',
    'tap_count', null, 'low', 'observation',
    null, 90, null, false, true
  ),
  (
    'mindful', '3-2-1 textures', 'Short tactile grounding when time is tight.',
    'Three textures, two temperatures, one weight you can feel.',
    'tap_count', null, 'low', 'grounding',
    '{"steps":[
      {"prompt":"Name 3 different textures you can touch nearby","duration_sec":20},
      {"prompt":"Name 2 places with different temperature on your skin","duration_sec":18},
      {"prompt":"Notice 1 weight you are carrying (bag, phone, clothing)","duration_sec":15}
    ]}'::jsonb,
    53, null, false, true
  ),
  (
    'mindful', 'Pulse and breath', 'Interoceptive anchor — body signals without judgment.',
    'Feel your pulse or the rise-fall of breath at your wrist or chest for 90 seconds.',
    'tap_count', null, 'medium', 'breath',
    null, 90, null, false, true
  );

-- 5. Cold tasks (8; outdoor disabled until weather integration)
insert into public.tasks (
  category, title, description, prompt_text, verification_method, tap_target,
  difficulty_tier, modality, step_data, duration_sec, safety_note, requires_outdoor, enabled
) values
  (
    'cold', 'Cold water on face', 'Quick vagal reset — splash or hold cool water on face.',
    'Splash or hold cold water on your face for the full timer.',
    'tap_count', null, 'medium', 'face',
    null, 90, 'Skip if you have circulation problems, Raynaud''s, heart conditions, or are pregnant.', false, true
  ),
  (
    'cold', 'Cold water on wrists', 'Run cold water over the inside of both wrists.',
    'Hold both wrists under cold running water. Switch if one wrist gets numb.',
    'tap_count', null, 'medium', 'wrist',
    null, 90, 'Skip if you have circulation problems, Raynaud''s, heart conditions, or are pregnant.', false, true
  ),
  (
    'cold', 'Cold cloth on neck', 'Cool the back of the neck with a damp cold cloth.',
    'Press a cold, damp cloth to the back of your neck. Breathe steadily.',
    'tap_count', null, 'medium', 'neck',
    null, 90, 'Skip if you have circulation problems, Raynaud''s, heart conditions, or are pregnant.', false, true
  ),
  (
    'cold', 'Ice cube in palm', 'Hold ice in one palm, switch hands halfway.',
    'Hold an ice cube in your palm. At 45 seconds, switch to the other hand.',
    'tap_count', null, 'medium', 'full',
    null, 90, 'Skip if you have circulation problems, Raynaud''s, heart conditions, or are pregnant.', false, true
  ),
  (
    'cold', 'Cold shower fragment', 'First minute only — do not force a full cold shower.',
    'Turn the shower cold. Stay for the first 60 seconds, then you can stop.',
    'tap_count', null, 'high', 'full',
    null, 60, 'Skip if you have circulation problems, Raynaud''s, heart conditions, or are pregnant.', false, true
  ),
  (
    'cold', 'Freezer breath', 'Brief cold air exposure — open, breathe, close.',
    'Open the freezer, stand and take slow breaths for 30 seconds, then close it.',
    'tap_count', null, 'low', 'face',
    null, 30, 'Skip if you have circulation problems, Raynaud''s, or are pregnant.', false, true
  ),
  (
    'cold', 'Step outside uncoated', 'Outdoor cold — disabled until weather check ships.',
    'Step outside without a coat for 90 seconds in genuinely cold weather.',
    'tap_count', null, 'medium', 'full',
    null, 90, 'Skip if you have circulation problems, Raynaud''s, heart conditions, or are pregnant.', true, false
  ),
  (
    'cold', 'Cold drink sip', 'Low-intensity temperature shift — sip and notice.',
    'Take a cold drink. Sip slowly for 90 seconds, noticing the temperature each time.',
    'tap_count', null, 'low', 'face',
    null, 90, null, false, true
  );

-- Post-migration audit query (run manually or in CI):
-- select category, difficulty_tier, count(*) from public.tasks where enabled group by 1, 2 order by 1, 2;
