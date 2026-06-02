// Curated library of "scene" prompts for the AI's turn (inverted roles, PRD §11).
//
// IMPORTANT: server-only. `answer` and `accept` are the solution + its accepted variants and
// must NEVER be sent to the client before the reveal. Routes expose `publicPrompt()` only.
//
// The data lives in prompts.data.json so the offline pre-generation script (scripts/
// pregenerate-clips.mjs, plain Node) and the TypeScript backend can share one source of truth.
import data from "./prompts.data.json";

export interface AiPrompt {
  /** Opaque id, also the pre-generated clip filename (e.g. "p01" → public/ai-clips/p01.mp4). */
  id: string;
  /** Text-to-video prompt sent to Veo. Depicts the scene WITHOUT naming the answer. */
  prompt: string;
  /** Canonical answer shown on reveal. */
  answer: string;
  /** Accepted answer variants/aliases for tolerant matching. */
  accept: string[];
  /** Pre-generated clip filename under public/ai-clips/ (empty if not generated yet). */
  clip: string;
}

/** Subset safe to send to the client (no answer/aliases). */
export type PublicPrompt = Pick<AiPrompt, "id">;

const PROMPTS: AiPrompt[] = data as AiPrompt[];

export function allPrompts(): AiPrompt[] {
  return PROMPTS;
}

export function getPrompt(id: string): AiPrompt | undefined {
  return PROMPTS.find((p) => p.id === id);
}

/** Prompts that already have a committed pre-generated clip in public/ai-clips/. */
export function promptsWithClip(): AiPrompt[] {
  return PROMPTS.filter((p) => p.clip.trim().length > 0);
}

function pick<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

/** Random prompt from the whole library (used by the generate path). */
export function pickRandomPrompt(): AiPrompt | undefined {
  return pick(PROMPTS);
}

/** Random prompt that has a pre-generated clip (used by the default path). */
export function pickRandomWithClip(): AiPrompt | undefined {
  return pick(promptsWithClip());
}

/** Public URL of a prompt's committed clip (served statically by Next from /public). */
export function clipUrl(p: AiPrompt): string {
  return `/ai-clips/${p.clip}`;
}
