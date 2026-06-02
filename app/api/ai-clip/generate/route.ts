import { getPrompt, pickRandomPrompt } from "@/lib/video/prompts";
import {
  completeJob,
  createDoneJob,
  createJob,
  failJob,
  getCachedBytes,
  getJob,
} from "@/lib/video/jobs";
import { generateClip } from "@/lib/video/veo";

// Veo runs on the Node runtime and can take minutes; the work happens in the background and the
// client polls. maxDuration covers the kickoff request only (the job outlives it).
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/ai-clip/generate  { promptId?: string }
 * Starts (or instantly resolves, if cached) a Veo generation job. Omit promptId for a random one.
 */
export async function POST(req: Request): Promise<Response> {
  let body: { promptId?: unknown } = {};
  try {
    body = (await req.json()) as { promptId?: unknown };
  } catch {
    // empty/invalid body → treat as "pick a random prompt"
  }

  const prompt =
    typeof body.promptId === "string" ? getPrompt(body.promptId) : pickRandomPrompt();
  if (!prompt) {
    return Response.json({ error: "Unknown or missing promptId." }, { status: 400 });
  }

  // Reuse cached bytes for this scene if we already generated it (saves cost + latency).
  const cached = getCachedBytes(prompt.id);
  if (cached) {
    const jobId = createDoneJob(prompt.id, cached);
    return Response.json({ jobId, promptId: prompt.id, status: "pending" });
  }

  const jobId = createJob(prompt.id);
  // Fire-and-forget: the job continues after this response returns.
  void generateClip(prompt.prompt).then(
    (bytes) => completeJob(jobId, prompt.id, bytes),
    (err) => failJob(jobId, prompt.id, err instanceof Error ? err.message : "Veo error.")
  );

  return Response.json({ jobId, promptId: prompt.id, status: "pending" });
}

/** GET /api/ai-clip/generate?jobId=...  → poll the job. */
export async function GET(req: Request): Promise<Response> {
  const jobId = new URL(req.url).searchParams.get("jobId");
  if (!jobId) return Response.json({ error: "Missing jobId." }, { status: 400 });

  const job = getJob(jobId);
  if (!job) return Response.json({ error: "Unknown jobId." }, { status: 404 });

  if (job.status === "pending") return Response.json({ status: "pending" });
  if (job.status === "error") return Response.json({ status: "error", message: job.message });
  return Response.json({
    status: "done",
    videoUrl: `/api/ai-clip/file?jobId=${jobId}`,
    promptId: job.promptId,
    source: "generated",
  });
}
