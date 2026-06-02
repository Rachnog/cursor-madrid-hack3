import type { Content } from "@google/genai";
import type { Domain } from "./types";

// Per-session conversation state. We keep the Gemini chat `history` (which includes references
// to previously uploaded videos) so a follow-up request can rebuild the chat and continue.
//
// NOTE: in-memory only — resets on server restart and is NOT shared across serverless workers.
// Fine for the hackathon/local demo; swap for SQLite/Redis to make it durable.
export interface Session {
  history: Content[];
  turn: number;
  domain: Domain;
}

const sessions = new Map<string, Session>();

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function createSession(id: string, domain: Domain): Session {
  const session: Session = { history: [], turn: 0, domain };
  sessions.set(id, session);
  return session;
}

export function saveSession(id: string, session: Session): void {
  sessions.set(id, session);
}
