import type { DifficultyTier, Task } from '@/types/database';

export function tiersForResilience(resilience: number): DifficultyTier[] {
  if (resilience >= 80) return ['high'];
  if (resilience < 40) return ['low'];
  return ['medium', 'low'];
}

export function filterTasksByResilience(tasks: Task[], resilience: number): Task[] {
  const allowed = new Set(tiersForResilience(resilience));
  const filtered = tasks.filter((t) => allowed.has(t.difficulty_tier));
  return filtered.length > 0 ? filtered : tasks;
}

export function pickRandomFromPool<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}
