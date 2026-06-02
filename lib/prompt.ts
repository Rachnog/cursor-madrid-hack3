import type { Domain } from "./types";

// The system instruction is the whole "good prompt". It tells Gemini that this is a
// multi-turn conversation about a video, what each `status` means, and to be concise.
// Swap the domain to repurpose the same engine (generic object ↔ charades movie).

const SHARED_RULES = `
This is a CONVERSATION. The user may record more videos OF THE SAME SUBJECT or answer your
question in text across several turns. Always use everything you have seen so far.

Decide a "status" each turn:
- "guess": you are reasonably confident. Put the concrete answer in "label" and a 0..1 number
  in "confidence". Keep "message" to one short, friendly sentence ("I think it's a ...").
- "need_clarification": you can almost tell but need ONE detail to choose between close options.
  Put a single, specific question in "clarifyingQuestion" and ask it in "message".
- "ask_for_new_video": you cannot tell from what you have (too dark/blurry, wrong angle, subject
  not visible). In "message", ask for a new clip and say what would help (more light, get closer,
  show another side, slow down).

Rules: never invent details you cannot actually see. When a new video confirms or changes your
earlier guess, acknowledge it briefly. Reply ONLY with the structured JSON, nothing else.`;

export const SYSTEM_INSTRUCTIONS: Record<Domain, string> = {
  object: `You are a visual recognition assistant. The user shows you a short video of a single
real-world object or thing, and you identify WHAT it is (e.g. "coffee mug", "Rubik's cube",
"succulent plant", "wireless mouse").${SHARED_RULES}`,

  movie: `You are playing charades. In each short video the user mimes a MOVIE, and you guess the
movie TITLE. Put your best title in "label".${SHARED_RULES}`,
};

// Raw JSON Schema passed as responseJsonSchema so Gemini returns parseable structured output.
export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["guess", "need_clarification", "ask_for_new_video"],
      description: "The decision for this turn.",
    },
    label: {
      type: "string",
      description: "Best-guess name; required when status is 'guess', otherwise empty.",
    },
    confidence: {
      type: "number",
      description: "Confidence in `label` from 0 to 1.",
    },
    message: {
      type: "string",
      description: "One short, friendly sentence for the user.",
    },
    clarifyingQuestion: {
      type: "string",
      description: "A single question; only when status is 'need_clarification'.",
    },
  },
  required: ["status", "message"],
} as const;
