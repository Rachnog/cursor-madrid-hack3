import { getGemini } from "@/lib/gemini";

// Veo (text-to-video) wrapper. Generation is async, slow (tens of seconds to minutes) and PAID —
// the game defaults to pre-generated clips and only calls this on the explicit "generate new" path.
//
// Override the model with VEO_MODEL. veo-3.0-fast-generate-001 is the cheaper/faster default.
export const VEO_MODEL = process.env.VEO_MODEL ?? "veo-3.0-fast-generate-001";

const POLL_INTERVAL_MS = 10_000;
const MAX_WAIT_MS = 5 * 60_000; // give Veo up to 5 minutes

/** Generate one clip from a text prompt and return the MP4 bytes. Throws on failure/timeout. */
export async function generateClip(prompt: string): Promise<Buffer> {
  const ai = getGemini();

  let operation = await ai.models.generateVideos({
    model: VEO_MODEL,
    prompt,
    config: {
      numberOfVideos: 1,
      aspectRatio: "16:9",
      // Allow people (chef, surfer, astronaut…); "dont_allow" would block those scenes.
      personGeneration: "allow_adult",
    },
  });

  const startedAt = Date.now();
  while (!operation.done) {
    if (Date.now() - startedAt > MAX_WAIT_MS) {
      throw new Error("Veo timed out generating the video.");
    }
    await sleep(POLL_INTERVAL_MS);
    operation = await ai.operations.getVideosOperation({ operation });
  }

  if (operation.error) {
    const msg =
      typeof operation.error === "object" && operation.error && "message" in operation.error
        ? String((operation.error as { message?: unknown }).message)
        : "Veo reported an error.";
    throw new Error(msg);
  }

  const video = operation.response?.generatedVideos?.[0]?.video;
  if (!video) throw new Error("Veo returned no video.");

  // Two delivery shapes: inline base64 bytes, or a download URI that needs the API key appended.
  if (video.videoBytes) {
    return Buffer.from(video.videoBytes, "base64");
  }
  if (video.uri) {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    const sep = video.uri.includes("?") ? "&" : "?";
    const res = await fetch(`${video.uri}${sep}key=${apiKey}`);
    if (!res.ok) throw new Error(`Failed to download generated video (HTTP ${res.status}).`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("Veo response had neither videoBytes nor a uri.");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
