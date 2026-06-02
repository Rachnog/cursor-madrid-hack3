import { randomUUID } from "node:crypto";
import { createPartFromUri, FileState, type File, type Part } from "@google/genai";
import { getGemini, MODEL } from "./gemini";
import { RESPONSE_SCHEMA, SYSTEM_INSTRUCTIONS } from "./prompt";
import { createSession, getSession, saveSession } from "./store";
import type { Domain, RecognizeResponse, RecognizeResult, RecognizeStatus } from "./types";

export interface RecognizeInput {
  /** Omit to start a new conversation; pass to continue an existing one. */
  sessionId?: string;
  /** The recorded clip. Required on the first turn. */
  video?: { data: Buffer; mimeType: string };
  /** Optional user text (e.g. an answer to a clarifying question). */
  text?: string;
  /** Recognition domain; only honored when creating a new session. */
  domain?: Domain;
}

const STATUSES: RecognizeStatus[] = ["guess", "need_clarification", "ask_for_new_video"];
const UPLOAD_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;

/**
 * Run one turn of the video recognition conversation.
 * Uploads the video (if any), continues the per-session Gemini chat, and returns a short
 * structured answer. State is kept by persisting the chat history per session.
 */
export async function recognize(input: RecognizeInput): Promise<RecognizeResponse> {
  if (!input.video && !input.text) {
    throw new Error("Provide a video and/or text.");
  }

  const ai = getGemini();

  // Resolve or create the session.
  let session = input.sessionId ? getSession(input.sessionId) : undefined;
  const sessionId = input.sessionId ?? randomUUID();
  if (!session) {
    if (!input.video) {
      throw new Error("The first turn of a conversation requires a video.");
    }
    session = createSession(sessionId, input.domain ?? "object");
  }

  // Build this turn's message parts: the uploaded video (if any) + a short text instruction.
  const parts: Part[] = [];
  if (input.video) {
    const file = await uploadAndWait(ai, input.video.data, input.video.mimeType);
    parts.push(createPartFromUri(file.uri!, file.mimeType ?? input.video.mimeType));
  }
  parts.push({ text: turnInstruction(session.turn, Boolean(input.video), input.text) });

  // Rebuild the chat from stored history and send the new turn.
  const chat = ai.chats.create({
    model: MODEL,
    history: session.history,
    config: {
      systemInstruction: SYSTEM_INSTRUCTIONS[session.domain],
      responseMimeType: "application/json",
      responseJsonSchema: RESPONSE_SCHEMA,
      temperature: 0.4,
    },
  });

  const response = await chat.sendMessage({ message: parts });
  const result = parseResult(response.text ?? "");

  // Persist updated history + turn counter for the next request.
  session.history = chat.getHistory();
  session.turn += 1;
  saveSession(sessionId, session);

  return { sessionId, turn: session.turn, ...result };
}

/** Upload a video to the Files API and poll until it is ACTIVE (videos need processing). */
async function uploadAndWait(
  ai: ReturnType<typeof getGemini>,
  data: Buffer,
  mimeType: string
): Promise<File> {
  const blob = new Blob([new Uint8Array(data)], { type: mimeType });
  let file = await ai.files.upload({ file: blob, config: { mimeType } });

  const startedAt = Date.now();
  while (file.state === FileState.PROCESSING) {
    if (Date.now() - startedAt > UPLOAD_TIMEOUT_MS) {
      throw new Error("Timed out waiting for the video to be processed.");
    }
    await sleep(POLL_INTERVAL_MS);
    file = await ai.files.get({ name: file.name! });
  }
  if (file.state === FileState.FAILED) {
    throw new Error("Gemini failed to process the uploaded video.");
  }
  return file;
}

/** Short per-turn instruction that frames the video/text for the model. */
function turnInstruction(turn: number, hasVideo: boolean, userText?: string): string {
  const text = userText?.trim();
  const lines: string[] = [];

  if (turn === 0) {
    lines.push("Here is a video. Identify what the person is showing.");
  } else if (hasVideo) {
    lines.push(
      "Here is another video OF THE SAME SUBJECT. Combine it with what you saw before and update your answer."
    );
  }
  if (text) {
    lines.push(`The user adds: "${text}".`);
    if (!hasVideo && turn > 0) {
      lines.push("Use this to answer your previous question.");
    }
  }
  return lines.join(" ");
}

/** Parse the model's JSON, with a defensive fallback if it isn't clean JSON. */
function parseResult(text: string): RecognizeResult {
  let raw: Record<string, unknown> = {};
  const parsed = tryParseJson(text);
  if (parsed) raw = parsed;

  const status: RecognizeStatus = STATUSES.includes(raw.status as RecognizeStatus)
    ? (raw.status as RecognizeStatus)
    : typeof raw.label === "string" && raw.label
      ? "guess"
      : "need_clarification";

  const message =
    typeof raw.message === "string" && raw.message.trim()
      ? raw.message.trim()
      : text.trim() || "Sorry, I couldn't interpret that — try another video.";

  return {
    status,
    label: typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : undefined,
    confidence: typeof raw.confidence === "number" ? clamp01(raw.confidence) : undefined,
    message,
    clarifyingQuestion:
      typeof raw.clarifyingQuestion === "string" && raw.clarifyingQuestion.trim()
        ? raw.clarifyingQuestion.trim()
        : undefined,
  };
}

function tryParseJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    // Models occasionally wrap JSON in prose or fences — grab the first {...} block.
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
