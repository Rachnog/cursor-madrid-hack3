import { randomUUID } from "node:crypto";

// In-memory store for async Veo generation jobs, plus a per-prompt cache so regenerating the same
// scene reuses the bytes (saves cost). Like 03's session store: resets on restart and is not shared
// across serverless workers — fine for the hackathon/local demo.
export type Job =
  | { status: "pending"; promptId: string }
  | { status: "done"; promptId: string; bytes: Buffer }
  | { status: "error"; promptId: string; message: string };

const jobs = new Map<string, Job>();
const cacheByPrompt = new Map<string, Buffer>();

export function getCachedBytes(promptId: string): Buffer | undefined {
  return cacheByPrompt.get(promptId);
}

export function createJob(promptId: string): string {
  const id = randomUUID();
  jobs.set(id, { status: "pending", promptId });
  return id;
}

/** Create a job that is already finished (used when the prompt's bytes are cached). */
export function createDoneJob(promptId: string, bytes: Buffer): string {
  const id = randomUUID();
  jobs.set(id, { status: "done", promptId, bytes });
  return id;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function completeJob(id: string, promptId: string, bytes: Buffer): void {
  cacheByPrompt.set(promptId, bytes);
  jobs.set(id, { status: "done", promptId, bytes });
}

export function failJob(id: string, promptId: string, message: string): void {
  jobs.set(id, { status: "error", promptId, message });
}
