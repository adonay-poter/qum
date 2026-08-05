alter table public.tasks
  add column if not exists difficulty_tier text not null default 'medium'
  check (difficulty_tier in ('low', 'medium', 'high'));

update public.tasks set difficulty_tier = 'low'
  where prompt_text ilike '%5%' or prompt_text ilike '%3 blue%';

update public.tasks set difficulty_tier = 'high'
  where prompt_text ilike '%20%' or prompt_text ilike '%15%' or prompt_text ilike '%floor plan%';

insert into public.tasks (category, prompt_text, verification_method, tap_target, difficulty_tier) values
  ('physical', 'Complete 5 standard pushups — tap each rep', 'tap_count', 5, 'low'),
  ('physical', 'Complete 20 squats — tap the hit box every rep', 'tap_count', 20, 'high'),
  ('cognitive', 'Type 3 blue objects you can physically see right now', 'text_input', null, 'low'),
  ('cognitive', 'Sketch a multi-layered room layout from memory', 'camera_upload', null, 'high')
;
