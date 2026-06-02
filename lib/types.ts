// Contrato del componente 03 (IA / Gemini). Compartido entre el backend y el frontend.
// Ver docs/specs/03-ai-gemini-integration.md.

/** Recognition domain: what the model should identify. */
export type Domain = "object" | "movie";

/**
 * What the AI decided this turn:
 * - "guess"             → confident enough; `label` holds the answer.
 * - "need_clarification"→ needs one detail; `clarifyingQuestion` is set.
 * - "ask_for_new_video" → can't tell; the user should record a new/better clip.
 */
export type RecognizeStatus = "guess" | "need_clarification" | "ask_for_new_video";

/** The model's structured answer for a single turn (matches RESPONSE_SCHEMA). */
export interface RecognizeResult {
  status: RecognizeStatus;
  /** Best-guess name (e.g. "coffee mug" / movie title). Present when status === "guess". */
  label?: string;
  /** Model confidence in `label`, 0..1. */
  confidence?: number;
  /** One short, human-facing sentence to show the user. */
  message: string;
  /** A single question; present when status === "need_clarification". */
  clarifyingQuestion?: string;
}

/** Full response body of POST /api/recognize. */
export interface RecognizeResponse extends RecognizeResult {
  /** Generated on the first turn; echo it back to continue the same conversation. */
  sessionId: string;
  /** 1-based turn counter for this session. */
  turn: number;
}
