// Offline pre-generation of the AI-turn clips with Veo (text-to-video).
// Run this ONCE, then commit the resulting .mp4 files so the game's default path is free + instant.
//
// Usage (needs GEMINI_API_KEY):
//   node --env-file=.env scripts/pregenerate-clips.mjs          # generate any missing clips
//   node --env-file=.env scripts/pregenerate-clips.mjs --force  # regenerate ALL clips
//   node --env-file=.env scripts/pregenerate-clips.mjs p01 p03  # only these prompt ids
//
// (A minimal .env loader is included too, so plain `node scripts/pregenerate-clips.mjs` also works.)
//
// Veo is slow (tens of seconds to minutes per clip) and PAID — check pricing before running.

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_FILE = join(ROOT, "lib", "video", "prompts.data.json");
const CLIPS_DIR = join(ROOT, "public", "ai-clips");

const MODEL = process.env.VEO_MODEL ?? "veo-3.0-fast-generate-001";
const POLL_MS = 10_000;

async function loadDotEnv() {
  try {
    const text = await readFile(join(ROOT, ".env"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // no .env — rely on the real environment
  }
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generateClip(ai, apiKey, prompt) {
  let op = await ai.models.generateVideos({
    model: MODEL,
    prompt,
    config: { numberOfVideos: 1, aspectRatio: "16:9", personGeneration: "allow_adult" },
  });
  while (!op.done) {
    await sleep(POLL_MS);
    op = await ai.operations.getVideosOperation({ operation: op });
  }
  if (op.error) throw new Error(op.error.message ?? "Veo error.");
  const video = op.response?.generatedVideos?.[0]?.video;
  if (!video) throw new Error("Veo returned no video.");
  if (video.videoBytes) return Buffer.from(video.videoBytes, "base64");
  if (video.uri) {
    const sep = video.uri.includes("?") ? "&" : "?";
    const res = await fetch(`${video.uri}${sep}key=${apiKey}`);
    if (!res.ok) throw new Error(`Download failed (HTTP ${res.status}).`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("Veo response had neither videoBytes nor a uri.");
}

async function main() {
  await loadDotEnv();
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("❌ Missing GEMINI_API_KEY (or GOOGLE_API_KEY). Add it to .env.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const onlyIds = args.filter((a) => !a.startsWith("--"));

  const prompts = JSON.parse(await readFile(DATA_FILE, "utf8"));
  await mkdir(CLIPS_DIR, { recursive: true });
  const ai = new GoogleGenAI({ apiKey });

  let generated = 0;
  for (const entry of prompts) {
    if (onlyIds.length && !onlyIds.includes(entry.id)) continue;

    const filename = `${entry.id}.mp4`;
    const alreadyHas = entry.clip && (await exists(join(CLIPS_DIR, filename)));
    if (alreadyHas && !force) {
      console.log(`⏭️  ${entry.id} — ya existe (${entry.clip}); usa --force para regenerar.`);
      continue;
    }

    console.log(`🎬 ${entry.id} — generando con ${MODEL}…\n    "${entry.prompt.slice(0, 70)}…"`);
    try {
      const bytes = await generateClip(ai, apiKey, entry.prompt);
      await writeFile(join(CLIPS_DIR, filename), bytes);
      entry.clip = filename;
      generated++;
      console.log(`✅ ${entry.id} → public/ai-clips/${filename} (${(bytes.length / 1e6).toFixed(1)} MB)`);
      // Persist after each success so a mid-run failure doesn't lose progress.
      await writeFile(DATA_FILE, JSON.stringify(prompts, null, 2) + "\n");
    } catch (err) {
      console.error(`❌ ${entry.id} falló: ${err.message}`);
    }
  }

  console.log(`\nListo. ${generated} clip(s) generado(s). Recuerda commitear los .mp4 y prompts.data.json.`);
}

main().catch((err) => {
  console.error("\n❌ pregenerate failed:", err.message);
  process.exit(1);
});
