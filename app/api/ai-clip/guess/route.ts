import { getPrompt } from "@/lib/video/prompts";
import { MAX_ATTEMPTS, matches, pointsFor } from "@/lib/video/matcher";

export const runtime = "nodejs";

/**
 * POST /api/ai-clip/guess  { promptId, guess, attempt }
 * Server-side matching of the human's guess against the prompt's aliases. The answer is revealed
 * only on a hit or after the final attempt — never sent to the client otherwise (no spoilers).
 */
export async function POST(req: Request): Promise<Response> {
  let body: { promptId?: unknown; guess?: unknown; attempt?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Expected JSON body." }, { status: 400 });
  }

  const prompt = typeof body.promptId === "string" ? getPrompt(body.promptId) : undefined;
  if (!prompt) {
    return Response.json({ error: "Unknown or missing promptId." }, { status: 400 });
  }

  const guess = typeof body.guess === "string" ? body.guess : "";
  const attempt = clampAttempt(body.attempt);

  const hit = matches(guess, prompt.accept);
  const points = hit ? pointsFor(attempt) : 0;
  const reveal = hit || attempt >= MAX_ATTEMPTS;

  return Response.json({
    hit,
    attempt,
    points,
    ...(reveal ? { answer: prompt.answer } : {}),
  });
}

function clampAttempt(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_ATTEMPTS, Math.max(1, Math.floor(n)));
}
