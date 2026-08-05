import { getFallbackTasks } from '@/data/fallbackTasks';
import { filterTasksByResilience, pickRandomFromPool } from '@/lib/tasks/difficultySelector';
import { readJson, writeJson } from '@/lib/storage/localStore';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { isOnline } from '@/lib/network/connectivity';
import { supabase } from '@/lib/supabase';
import type { Task, TaskCategory } from '@/types/database';

export type { Phase2Variant } from '@/lib/phase2/phase2Routing';

const TASK_SELECT =
  'id, category, prompt_text, verification_method, tap_target, difficulty_tier, title, description, modality, step_data, duration_sec, safety_note, requires_outdoor, enabled';

/** Session-scoped — not persisted across app restarts. */
const sessionLastTaskIdByCategory: Partial<Record<TaskCategory, string>> = {};
let sessionLastMindfulModality: string | null = null;

function isPhase1ReadyTask(task: Task): boolean {
  if (task.enabled === false) return false;
  if (task.requires_outdoor) return false;
  if (task.category === 'mindful' || task.category === 'cold') {
    return task.duration_sec != null || task.step_data != null;
  }
  return true;
}

function applyAntiRepeat(pool: Task[], category: TaskCategory): Task[] {
  const lastId = sessionLastTaskIdByCategory[category];
  if (!lastId || pool.length < 3) return pool;
  const withoutLast = pool.filter((t) => t.id !== lastId);
  return withoutLast.length > 0 ? withoutLast : pool;
}

function applyModalityAntiRepeat(pool: Task[]): Task[] {
  if (!sessionLastMindfulModality || pool.length < 3) return pool;
  const different = pool.filter((t) => t.modality !== sessionLastMindfulModality);
  return different.length > 0 ? different : pool;
}

function rememberPick(task: Task): void {
  sessionLastTaskIdByCategory[task.category] = task.id;
  if (task.category === 'mindful' && task.modality) {
    sessionLastMindfulModality = task.modality;
  }
}

function pickFromCategoryPool(pool: Task[], category: TaskCategory): Task {
  let candidates = pool.filter((t) => t.category === category && isPhase1ReadyTask(t));
  if (!candidates.length) {
    candidates = getFallbackTasks().filter((t) => t.category === category && isPhase1ReadyTask(t));
  }
  if (category === 'mindful') {
    candidates = applyModalityAntiRepeat(candidates);
  }
  candidates = applyAntiRepeat(candidates, category);
  const picked = pickRandomFromPool(candidates.length ? candidates : pool);
  rememberPick(picked);
  return picked;
}

export function getCachedTasks(): Task[] {
  return readJson<Task[]>(STORAGE_KEYS.TASK_CACHE) ?? getFallbackTasks();
}

export async function refreshTaskCache(): Promise<Task[]> {
  if (!isOnline()) return getCachedTasks();

  const { data, error } = await supabase.from('tasks').select(TASK_SELECT);

  if (error || !data?.length) {
    const fallback = getFallbackTasks();
    writeJson(STORAGE_KEYS.TASK_CACHE, fallback);
    return fallback;
  }

  const tasks = data as Task[];
  writeJson(STORAGE_KEYS.TASK_CACHE, tasks);
  return tasks;
}

export function pickBodyTask(resilienceLevel: number): Task {
  return pickTask('physical', resilienceLevel);
}

export function pickMindfulTask(resilienceLevel: number): Task {
  return pickTask('mindful', resilienceLevel);
}

export function pickColdTask(resilienceLevel: number): Task {
  return pickTask('cold', resilienceLevel);
}

export function pickTask(category: TaskCategory, resilienceLevel: number): Task {
  const cache = getCachedTasks();
  const pool = cache.filter((t) => t.category === category);
  const scaled = filterTasksByResilience(pool.length ? pool : getFallbackTasks(), resilienceLevel);
  const categoryPool = scaled.filter((t) => t.category === category);
  const finalPool = categoryPool.length
    ? categoryPool
    : getFallbackTasks().filter((t) => t.category === category);
  return pickFromCategoryPool(
    finalPool.length ? finalPool : getFallbackTasks(),
    category,
  );
}
