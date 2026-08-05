import { pickTask, refreshTaskCache } from '@/repositories/taskRepository';
import type { Task, TaskCategory } from '@/types/database';

export { refreshTaskCache, pickTask };

export async function fetchRandomTask(
  category: TaskCategory,
  resilienceLevel = 100,
): Promise<Task> {
  await refreshTaskCache();
  return pickTask(category, resilienceLevel);
}
