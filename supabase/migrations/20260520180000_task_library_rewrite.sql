-- Task library rewrite: craving-appropriate mindful pool, Ethiopian cognitive tasks,
-- cold tasks without freezer/ice assumptions. Removes abstract visualization/vipassana tasks.

-- 1. Delete inappropriate or resource-assuming tasks (by title; IDs included for prod parity)
delete from public.tasks
where title in (
  'Urge as weather',
  'Safe place',
  'Noting thoughts',
  'Freezer breath',
  'Ice cube in palm'
)
or id in (
  '0ad665ce-4488-455a-9c54-5c405c745936',
  '3a1857a7-b739-452a-ac7b-80123bcdef1d',
  'c021c401-a9e3-4c9d-889a-f4d8fad0e235',
  '49396bc6-b54f-4ba7-a090-d27cd7ea2ddd',
  '937ba784-5839-4f8c-9ac6-f41cd933fbee'
);

-- 2. Rewrite borderline mindful tasks to be more concrete
update public.tasks set
  prompt_text = 'Place one hand on your chest and one on your belly. Feel which one moves more. Stay with whichever is moving for 90 seconds.',
  description = 'Hands as anchors — the body shows you where breath is.'
where title = 'Breath anchor spot'
   or id = '1d15d0ab-f395-4c9b-8788-d46fe9ce9788';

update public.tasks set
  prompt_text = 'Pick one object you can see. Find five details about it you had not noticed: a scratch, a shadow, a join, a color shift, a stain.',
  description = 'Five-detail observation — concrete and ends when you find them.',
  duration_sec = 60
where title = 'One object study'
   or id = '0d153dbf-d8e2-4ae4-b2ae-8f23f8df8eaa';

update public.tasks set
  prompt_text = 'Count your next 10 breaths. If you lose count, just restart from 1. No failure — just begin again.',
  description = 'Counting with permission to restart.'
where title = 'Ten breaths'
   or id = 'dab96b42-eb42-434d-8f8c-b0e6693bd71c';

-- 3. New mindful tasks (concrete, externally anchored, forgiving; prompts ≤ ~20 words)
insert into public.tasks (
  category, prompt_text, verification_method, difficulty_tier, title, description,
  modality, step_data, duration_sec, requires_outdoor, enabled
) values
  (
    'mindful',
    'Press your back firmly against a wall, chair, or floor. Feel exactly where you make contact. Stay still.',
    'tap_count', 'low', 'Wall contact',
    'Spine and gravity — feel where your body meets a surface.',
    'grounding', null, 60, false, true
  ),
  (
    'mindful',
    'Find five things in your space that are different colors. Look at each one for 8 seconds before moving to the next.',
    'tap_count', 'low', 'Five colors',
    'Color hunt with timed pauses on each.',
    'observation',
    '{"steps":[
      {"prompt":"Find something RED and look at it","duration_sec":12},
      {"prompt":"Find something GREEN and look at it","duration_sec":12},
      {"prompt":"Find something BLUE and look at it","duration_sec":12},
      {"prompt":"Find something BLACK or DARK and look at it","duration_sec":12},
      {"prompt":"Find something WHITE or LIGHT and look at it","duration_sec":12}
    ]}'::jsonb,
    60, false, true
  ),
  (
    'mindful',
    'Hold any object in both hands — phone, cup, book. Notice its weight, temperature, and the texture under your fingertips.',
    'tap_count', 'low', 'Object in hands',
    'Tactile anchor — three sensations on one object.',
    'observation', null, 60, false, true
  ),
  (
    'mindful',
    'Listen for the farthest sound you can hear. Then the closest. Switch your attention between them.',
    'tap_count', 'low', 'Near and far',
    'Auditory zoom — far, near, far, near.',
    'noting',
    '{"steps":[
      {"prompt":"Listen for the FARTHEST sound you can hear","duration_sec":20},
      {"prompt":"Now listen for the CLOSEST sound you can hear","duration_sec":20},
      {"prompt":"Switch back to the FAR sound","duration_sec":15},
      {"prompt":"Switch to the CLOSE sound","duration_sec":15}
    ]}'::jsonb,
    70, false, true
  ),
  (
    'mindful',
    'Press your palms together hard for 5 seconds, then let them rest. Notice the difference. Repeat 6 times.',
    'tap_count', 'low', 'Palm press',
    'Tension and release in the hands — six rounds, tap each release.',
    'body_scan', null, 60, false, true
  ),
  (
    'mindful',
    'Slowly count the right angles you can see in this space — corners of walls, edges of doors, shapes of furniture.',
    'tap_count', 'low', 'Count the angles',
    'Geometric scan — counting is the practice.',
    'observation', null, 60, false, true
  ),
  (
    'mindful',
    'Trace your jaw with your fingertips, then your collarbone, then your shoulders. Slowly. Do each one twice.',
    'tap_count', 'medium', 'Trace three lines',
    'Tactile body map — jaw, collarbone, shoulders.',
    'body_scan',
    '{"steps":[
      {"prompt":"Trace your jawline with two fingers — slowly, both sides","duration_sec":25},
      {"prompt":"Trace along your collarbone — from center outward, both sides","duration_sec":25},
      {"prompt":"Trace the top of your shoulders — back to front","duration_sec":25}
    ]}'::jsonb,
    75, false, true
  ),
  (
    'mindful',
    'Hum a single low note for as long as one breath lasts. Rest. Repeat 4 times.',
    'tap_count', 'medium', 'Four hums',
    'Vocal vibration — the body feels its own sound.',
    'breath',
    '{"steps":[
      {"prompt":"Take a breath in. Hum a low note until you need air","duration_sec":20},
      {"prompt":"Rest. Breathe normally","duration_sec":10},
      {"prompt":"Breath in. Hum again — same or different note","duration_sec":20},
      {"prompt":"Rest","duration_sec":10},
      {"prompt":"One more hum","duration_sec":15}
    ]}'::jsonb,
    75, false, true
  ),
  (
    'mindful',
    'Feet flat on the floor. Notice each toe — big toe first, then across both feet.',
    'tap_count', 'medium', 'Toe by toe',
    'Foot mapping — slow attention to each toe.',
    'body_scan',
    '{"steps":[
      {"prompt":"Both feet flat. Notice the big toe on your right foot","duration_sec":12},
      {"prompt":"Move attention across — second, third, fourth, little toe","duration_sec":20},
      {"prompt":"Switch to left foot — big toe first","duration_sec":12},
      {"prompt":"Move across the left foot","duration_sec":20},
      {"prompt":"Feel both whole feet at once","duration_sec":15}
    ]}'::jsonb,
    79, false, true
  ),
  (
    'mindful',
    'Find three objects with visible edges. Trace each edge with your eyes only — not your fingers.',
    'tap_count', 'medium', 'Edge tracing',
    'Visual tracing without touch — three objects.',
    'observation',
    '{"steps":[
      {"prompt":"Pick a first object with clear edges. Trace it with your eyes only","duration_sec":25},
      {"prompt":"Pick a second object. Trace its edges","duration_sec":25},
      {"prompt":"Pick a third — trace slowly","duration_sec":25}
    ]}'::jsonb,
    75, false, true
  ),
  (
    'mindful',
    'Put one hand on your chest, one on your belly. Notice which moves more when you breathe. Stay with that one.',
    'tap_count', 'medium', 'Two hands check',
    'Hands as breath sensors — find which one moves.',
    'breath', null, 75, false, true
  ),
  (
    'mindful',
    'Face one wall. Name what you see. Turn 90°. Repeat until you have faced four directions.',
    'tap_count', 'high', 'Four-direction sweep',
    'Quarter-turn observation — 30 seconds per direction.',
    'observation',
    '{"steps":[
      {"prompt":"Face the first wall or direction. Name everything you see in detail","duration_sec":30},
      {"prompt":"Turn 90 degrees. Name everything you see","duration_sec":30},
      {"prompt":"Turn 90 degrees again. Name what is in front of you","duration_sec":30},
      {"prompt":"Final 90 degrees. Look at the last direction","duration_sec":30}
    ]}'::jsonb,
    120, false, true
  ),
  (
    'mindful',
    'Cross-body touch: right hand to left shoulder for 15 seconds. Then left to right. Do this six times total.',
    'tap_count', 'high', 'Cross-body anchor',
    'Bilateral grounding — alternating hands across the body.',
    'body_scan',
    '{"steps":[
      {"prompt":"Right hand on left shoulder. Stay","duration_sec":15},
      {"prompt":"Switch — left hand on right shoulder","duration_sec":15},
      {"prompt":"Switch back","duration_sec":15},
      {"prompt":"And switch","duration_sec":15},
      {"prompt":"Right on left one more time","duration_sec":15},
      {"prompt":"Final switch","duration_sec":15}
    ]}'::jsonb,
    90, false, true
  ),
  (
    'mindful',
    'Pick one nearby sound. Stay with it. Mind drifts? Gently return. Each return is the practice.',
    'tap_count', 'high', 'Sound anchor with return',
    'Attention anchor that explicitly permits return — losing focus is part of it.',
    'noting', null, 90, false, true
  );

-- 4. Ethiopian-context cognitive tasks (no specific city/region assumptions)
insert into public.tasks (category, prompt_text, verification_method, difficulty_tier, enabled) values
  ('cognitive', 'Type 5 Ethiopian dishes you can name', 'text_input', 'low', true),
  ('cognitive', 'Type 5 cities or towns in Ethiopia', 'text_input', 'low', true),
  ('cognitive', 'Type 5 Amharic (or your first language) words for things in this room', 'text_input', 'low', true),
  ('cognitive', 'Type 5 markets or neighborhoods in your city', 'text_input', 'low', true),
  ('cognitive', 'Type 5 specific people who have shown you kindness this year', 'text_input', 'low', true),
  ('cognitive', 'Type 10 cities, towns, or regions in Ethiopia', 'text_input', 'medium', true),
  ('cognitive', 'Type 10 Ethiopian musicians, writers, athletes, or public figures', 'text_input', 'medium', true),
  ('cognitive', 'Type 10 Ethiopian dishes — main dishes, sides, or drinks', 'text_input', 'medium', true),
  ('cognitive', 'Type 10 verbs in Amharic (or your first language) for everyday actions', 'text_input', 'medium', true),
  ('cognitive', 'Type 10 places you have visited that you remember clearly', 'text_input', 'medium', true),
  ('cognitive', 'Sketch a coffee ceremony setup — jebena, sini cups, and the area around them', 'camera_upload', 'medium', true),
  ('cognitive', 'Sketch a mesob or table with at least 4 dishes on it', 'camera_upload', 'medium', true),
  ('cognitive', 'Type 15 places in Ethiopia you have been to or would like to visit', 'text_input', 'high', true),
  ('cognitive', 'Type 15 specific moments from the past year you are glad happened', 'text_input', 'high', true),
  ('cognitive', 'Sketch a map of Ethiopia with at least 5 cities or regions marked', 'camera_upload', 'high', true),
  ('cognitive', 'Type 15 small, concrete things you could do this month for someone you care about', 'text_input', 'high', true);

-- 5. Cold tasks without freezer or ice
insert into public.tasks (
  category, prompt_text, verification_method, difficulty_tier, title, description,
  modality, duration_sec, safety_note, requires_outdoor, enabled
) values
  (
    'cold',
    'Run cold tap water over both forearms, slowly, for the full timer.',
    'tap_count', 'low', 'Cold forearms',
    'Forearms under cold tap water — slow and steady.',
    'wrist', 60,
    'Skip if you have circulation problems, Raynaud''s, heart conditions, or are pregnant.',
    false, true
  ),
  (
    'cold',
    'Wet a cloth with cold water, wring it out, press to your forehead. Re-wet at 45 seconds.',
    'tap_count', 'medium', 'Cold cloth forehead',
    'A cold damp cloth pressed gently to the forehead.',
    'face', 90,
    'Skip if you have circulation problems, Raynaud''s, heart conditions, or are pregnant.',
    false, true
  ),
  (
    'cold',
    'Splash cool or cold water on your face three times. Pause between each splash. Breathe slowly.',
    'tap_count', 'low', 'Three splashes',
    'Three slow water splashes — pause between each.',
    'face', 60,
    'Skip if you have heart conditions or are pregnant.',
    false, true
  );
