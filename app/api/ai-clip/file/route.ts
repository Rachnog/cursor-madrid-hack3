import { getJob } from "@/lib/video/jobs";

export const runtime = "nodejs";

/**
 * GET /api/ai-clip/file?jobId=...  → stream the generated MP4 from memory.
 * Used by the "generate new" path (pre-generated clips are served statically from /public).
 */
export async function GET(req: Request): Promise<Response> {
  const jobId = new URL(req.url).searchParams.get("jobId");
  if (!jobId) return new Response("Missing jobId.", { status: 400 });

  const job = getJob(jobId);
  if (!job || job.status !== "done") {
    return new Response("Clip not ready.", { status: 404 });
  }

  return new Response(new Uint8Array(job.bytes), {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(job.bytes.length),
      "Cache-Control": "no-store",
    },
  });
}
