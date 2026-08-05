import type { Task, TaskCategory } from '@/types/database';

export const FALLBACK_TASKS: Task[] = [
  {
    id: 'local-physical-low',
    category: 'physical',
    prompt_text: 'Complete 5 standard pushups — tap each rep',
    verification_method: 'tap_count',
    tap_target: 5,
    difficulty_tier: 'low',
  },
  {
    id: 'local-physical-med',
    category: 'physical',
    prompt_text: 'Do 10 pushups — tap with your nose on each rep',
    verification_method: 'tap_count',
    tap_target: 10,
    difficulty_tier: 'medium',
  },
  {
    id: 'local-physical-high',
    category: 'physical',
    prompt_text: 'Complete 20 squats — tap the hit box every rep',
    verification_method: 'tap_count',
    tap_target: 20,
    difficulty_tier: 'high',
  },
  {
    id: 'local-cognitive-low',
    category: 'cognitive',
    prompt_text: 'Type 3 blue objects you can physically see right now',
    verification_method: 'text_input',
    tap_target: null,
    difficulty_tier: 'low',
  },
  {
    id: 'local-cognitive-med',
    category: 'cognitive',
    prompt_text: 'List 12 countries that start with the letter B',
    verification_method: 'text_input',
    tap_target: null,
    difficulty_tier: 'medium',
  },
  {
    id: 'local-cognitive-high',
    category: 'cognitive',
    prompt_text: 'Sketch a multi-layered room layout from memory',
    verification_method: 'camera_upload',
    tap_target: null,
    difficulty_tier: 'high',
  },
  {
    id: 'local-cognitive-sketch',
    category: 'cognitive',
    prompt_text: 'Sketch a famous actor from memory',
    verification_method: 'camera_upload',
    tap_target: null,
    difficulty_tier: 'medium',
  },
  {
    id: 'local-mindful-low',
    category: 'mindful',
    title: 'Three sounds',
    description: 'Auditory noting from near to far.',
    prompt_text: 'Notice three different sounds in this moment, near to far.',
    verification_method: 'tap_count',
    tap_target: null,
    difficulty_tier: 'low',
    modality: 'noting',
    duration_sec: 90,
    enabled: true,
  },
  {
    id: 'local-mindful-med',
    category: 'mindful',
    title: '5-4-3-2-1 grounding',
    description: 'Classic sensory grounding when the urge is loud.',
    prompt_text: 'Name 5 things you see, 4 you hear, 3 you feel, 2 you smell, 1 good thing now.',
    verification_method: 'tap_count',
    tap_target: null,
    difficulty_tier: 'medium',
    modality: 'grounding',
    duration_sec: 99,
    step_data: {
      steps: [
        { prompt: 'Name 5 things you can SEE', duration_sec: 30 },
        { prompt: 'Name 4 things you can HEAR', duration_sec: 24 },
        { prompt: 'Name 3 things you can FEEL', duration_sec: 18 },
        { prompt: 'Name 2 things you can SMELL', duration_sec: 12 },
        { prompt: 'Name 1 good thing about right now', duration_sec: 15 },
      ],
    },
    enabled: true,
  },
  {
    id: 'local-cold-low',
    category: 'cold',
    title: 'Cold drink sip',
    description: 'Low-intensity temperature shift.',
    prompt_text: 'Sip a cold drink slowly for 90 seconds, noticing the temperature.',
    verification_method: 'tap_count',
    tap_target: null,
    difficulty_tier: 'low',
    modality: 'face',
    duration_sec: 90,
    enabled: true,
  },
  {
    id: 'local-cold-med',
    category: 'cold',
    title: 'Cold water on face',
    description: 'Quick vagal reset.',
    prompt_text: 'Splash or hold cold water on your face for the full timer.',
    verification_method: 'tap_count',
    tap_target: null,
    difficulty_tier: 'medium',
    modality: 'face',
    duration_sec: 90,
    safety_note: 'Skip if you have circulation problems, Raynaud\'s, heart conditions, or are pregnant.',
    enabled: true,
  },
];

export function getFallbackTasks(): Task[] {
  return FALLBACK_TASKS;
}

export function getFallbackTask(category: TaskCategory): Task {
  const pool = FALLBACK_TASKS.filter((t) => t.category === category);
  return pool[Math.floor(Math.random() * pool.length)] ?? FALLBACK_TASKS[0];
}
