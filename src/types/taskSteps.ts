export interface TaskStep {
  prompt: string;
  duration_sec: number;
}

export interface TaskStepData {
  steps: TaskStep[];
}

export function parseTaskStepData(raw: unknown): TaskStepData | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as TaskStepData;
  if (!Array.isArray(data.steps) || data.steps.length === 0) return null;
  const valid = data.steps.every(
    (s) => typeof s.prompt === 'string' && typeof s.duration_sec === 'number' && s.duration_sec > 0,
  );
  return valid ? data : null;
}
