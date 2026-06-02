import { recognize } from "@/lib/recognizer";
import type { Domain } from "@/lib/types";

// The Files API + Node Buffers need the Node.js runtime (not Edge). Allow time for
// video upload + processing + the model call.
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/recognize  — multipart/form-data
 *   video      File    (required on the first turn)
 *   sessionId  string? (omit to start; pass to continue the same conversation)
 *   text       string? (e.g. an answer to a clarifying question)
 *   domain     string? ('object' default | 'movie')
 */
export async function POST(req: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json(
      { error: "Expected multipart/form-data with a 'video' field." },
      { status: 400 }
    );
  }

  const sessionId = asString(form.get("sessionId"));
  const text = asString(form.get("text"));
  const domain = parseDomain(asString(form.get("domain")));

  let video: { data: Buffer; mimeType: string } | undefined;
  const videoField = form.get("video");
  if (videoField && typeof videoField !== "string") {
    const file = videoField as File;
    if (file.size > 0) {
      video = {
        data: Buffer.from(await file.arrayBuffer()),
        mimeType: file.type || "video/webm",
      };
    }
  }

  if (!video && !text) {
    return Response.json({ error: "Provide a video or text." }, { status: 400 });
  }
  if (!sessionId && !video) {
    return Response.json(
      { error: "The first turn requires a video." },
      { status: 400 }
    );
  }

  try {
    const result = await recognize({ sessionId, video, text, domain });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    const status = message.startsWith("Missing GEMINI_API_KEY") ? 503 : 500;
    console.error("[/api/recognize]", err);
    return Response.json({ error: message }, { status });
  }
}

function asString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseDomain(value: string | undefined): Domain | undefined {
  return value === "movie" || value === "object" ? value : undefined;
}
