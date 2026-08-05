-- Run after 20260520170000_phase1_mindful_cold_tasks.sql
-- Fails if any multi-step task has mismatched duration_sec vs step sum.

select
  id,
  title,
  category,
  duration_sec,
  (
    select coalesce(sum((s->>'duration_sec')::int), 0)
    from jsonb_array_elements(step_data->'steps') s
  ) as step_sum
from public.tasks
where step_data is not null
  and duration_sec is distinct from (
    select coalesce(sum((s->>'duration_sec')::int), 0)
    from jsonb_array_elements(step_data->'steps') s
  );

-- Expected: 0 rows

select category, difficulty_tier, count(*) as task_count
from public.tasks
where coalesce(enabled, true)
group by category, difficulty_tier
order by category, difficulty_tier;
