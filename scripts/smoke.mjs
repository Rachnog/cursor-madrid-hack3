// Headless multi-turn smoke test for POST /api/recognize.
// Proves continuation: turn 1 starts a session, turn 2 reuses the sessionId.
//
// Usage (with the dev server running and GEMINI_API_KEY set in .env):
//   npm run dev                       # in one terminal
//   node scripts/smoke.mjs path/to/clip.webm [path/to/second-clip.webm]
//
// Optional env: BASE_URL (default http://localhost:3000), DOMAIN (object|movie).

import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const DOMAIN = process.env.DOMAIN ?? "object";

const MIME = {
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".mov": "video/mov",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpg",
};

async function loadClip(path) {
  const buf = await readFile(path);
  const type = MIME[extname(path).toLowerCase()] ?? "video/mp4";
  return new Blob([buf], { type });
}

async function recognize({ clip, sessionId, text }) {
  const form = new FormData();
  if (clip) form.append("video", await loadClip(clip), basename(clip));
  if (sessionId) form.append("sessionId", sessionId);
  else form.append("domain", DOMAIN);
  if (text) form.append("text", text);

  const res = await fetch(`${BASE_URL}/api/recognize`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

function show(title, r) {
  console.log(`\n=== ${title} ===`);
  console.log(`status : ${r.status}`);
  if (r.label) console.log(`label  : ${r.label}${r.confidence != null ? ` (${Math.round(r.confidence * 100)}%)` : ""}`);
  console.log(`message: ${r.message}`);
  if (r.clarifyingQuestion) console.log(`ask    : ${r.clarifyingQuestion}`);
  console.log(`session: ${r.sessionId}  turn: ${r.turn}`);
}

async function main() {
  const clip1 = process.argv[2];
  const clip2 = process.argv[3] ?? clip1; // reuse the same clip if a second isn't given
  if (!clip1) {
    console.error("Usage: node scripts/smoke.mjs <clip.webm> [second-clip.webm]");
    process.exit(1);
  }

  const t1 = await recognize({ clip: clip1 });
  show("Turn 1 (new conversation)", t1);

  const t2 = await recognize({ clip: clip2, sessionId: t1.sessionId });
  show("Turn 2 (same session — must continue)", t2);

  console.log(
    `\n${t2.sessionId === t1.sessionId ? "✅" : "❌"} continuation: turn 2 reused session ${t1.sessionId}`
  );
}

main().catch((err) => {
  console.error("\n❌ smoke test failed:", err.message);
  process.exit(1);
});
