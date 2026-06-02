// Tolerant, free-form matching for the AI's turn. The human types what they think the clip shows;
// we compare it against the prompt's accepted aliases. Kept here (separate from 04's scoreRound)
// because this turn matches a free-form scene, not a movie title — but it uses the same
// normalization idea and the same point scale (PRD §6) for consistency.

/** Lowercase, strip accents, drop punctuation, collapse whitespace. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True if the guess reasonably matches any accepted alias. Tolerant on purpose:
 * an alias appearing inside the guess ("creo que es un dinosaurio enorme") counts, and so does a
 * guess that is itself contained in a (longer) alias.
 */
export function matches(guess: string, accept: string[]): boolean {
  const g = normalize(guess);
  if (!g) return false;
  return accept.some((alias) => {
    const a = normalize(alias);
    if (!a) return false;
    return g === a || g.includes(a) || a.includes(g);
  });
}

/** Points by attempt number (1-based): 100 / 60 / 30, then 0. Mirrors PRD §6. */
export function pointsFor(attempt: number): number {
  switch (attempt) {
    case 1:
      return 100;
    case 2:
      return 60;
    case 3:
      return 30;
    default:
      return 0;
  }
}

/** Max number of guess attempts the human gets, symmetric with the AI's 3 attempts. */
export const MAX_ATTEMPTS = 3;
