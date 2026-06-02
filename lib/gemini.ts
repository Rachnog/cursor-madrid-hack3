import { GoogleGenAI } from "@google/genai";

// Lazily-created singleton client. We resolve the key at call time (not import time)
// so the app can build without a key present; the route surfaces a clear error instead.
let client: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY (or GOOGLE_API_KEY). Add it to .env — see .env.example."
    );
  }
  client = new GoogleGenAI({ apiKey });
  return client;
}

/** Model used for video understanding. Override with GEMINI_MODEL. */
export const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
