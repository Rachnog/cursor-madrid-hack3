import { pickRandomWithClip, clipUrl } from "@/lib/video/prompts";

export const runtime = "nodejs";

/**
 * GET /api/ai-clip  → a random PRE-GENERATED clip for the AI's turn.
 * Returns { clip: null, message } when no clips have been generated/committed yet (run
 * `node scripts/pregenerate-clips.mjs`, or use the "generate new" path).
 * Never reveals the answer — only the opaque promptId + video URL.
 */
export async function GET(): Promise<Response> {
  const prompt = pickRandomWithClip();
  if (!prompt) {
    return Response.json({
      clip: null,
      message:
        "No hay clips pre-generados todavía. Ejecuta `node scripts/pregenerate-clips.mjs` o usa 'generar vídeo nuevo'.",
    });
  }
  return Response.json({
    clip: { promptId: prompt.id, videoUrl: clipUrl(prompt), source: "pregenerated" },
  });
}
