"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_ATTEMPTS = 3; // mirrors lib/video/matcher.ts
const POLL_MS = 5000;

type Phase = "idle" | "loading" | "guessing" | "result" | "error";

interface Clip {
  promptId: string;
  videoUrl: string;
}

interface Attempt {
  guess: string;
  hit: boolean;
  points: number;
}

interface RoundResult {
  hit: boolean;
  points: number;
  answer?: string;
}

export default function AiActingStage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [generateNew, setGenerateNew] = useState(false);
  const [clip, setClip] = useState<Clip | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [attemptNo, setAttemptNo] = useState(1);
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState<RoundResult | null>(null);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mountedRef = useRef(true);
  const loadSeq = useRef(0);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const startRound = useCallback(async () => {
    const seq = ++loadSeq.current;
    setError(null);
    setClip(null);
    setAttempts([]);
    setAttemptNo(1);
    setGuess("");
    setResult(null);
    setPhase("loading");

    try {
      let next: Clip;
      if (generateNew) {
        const start = await postJson("/api/ai-clip/generate", {});
        if (start.error) throw new Error(start.error);
        const videoUrl = await pollJob(start.jobId as string, seq);
        next = { promptId: start.promptId as string, videoUrl };
      } else {
        const data = await getJson("/api/ai-clip");
        if (!data.clip) {
          if (loadSeq.current === seq && mountedRef.current) {
            setError(data.message as string);
            setPhase("error");
          }
          return;
        }
        next = { promptId: data.clip.promptId as string, videoUrl: data.clip.videoUrl as string };
      }
      if (loadSeq.current !== seq || !mountedRef.current) return;
      setClip(next);
      setPhase("guessing");
    } catch (err) {
      if (loadSeq.current !== seq || !mountedRef.current) return;
      if (err instanceof Error && err.message === "cancelled") return;
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setPhase("error");
    }
  }, [generateNew]);

  const pollJob = useCallback(async (jobId: string, seq: number): Promise<string> => {
    for (;;) {
      if (loadSeq.current !== seq) throw new Error("cancelled");
      await sleep(POLL_MS);
      if (loadSeq.current !== seq) throw new Error("cancelled");
      const s = await getJson(`/api/ai-clip/generate?jobId=${jobId}`);
      if (s.status === "done") return s.videoUrl as string;
      if (s.status === "error") throw new Error((s.message as string) || "Falló la generación.");
    }
  }, []);

  const submitGuess = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const g = guess.trim();
      if (!g || !clip || busy) return;
      setGuess("");
      setBusy(true);
      try {
        const res = await postJson("/api/ai-clip/guess", {
          promptId: clip.promptId,
          guess: g,
          attempt: attemptNo,
        });
        if (res.error) throw new Error(res.error);
        setAttempts((prev) => [...prev, { guess: g, hit: res.hit, points: res.points }]);
        if (res.hit || attemptNo >= MAX_ATTEMPTS) {
          setResult({ hit: res.hit, points: res.points, answer: res.answer });
          setScore((s) => s + (res.points as number));
          setPhase("result");
        } else {
          setAttemptNo((n) => n + 1);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado.");
      } finally {
        setBusy(false);
      }
    },
    [attemptNo, busy, clip, guess]
  );

  const loadingCopy = generateNew
    ? "🎨 La IA está creando su mímica… (puede tardar ~1 min)"
    : "🤖 La IA prepara su mímica…";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ color: "var(--muted)", fontSize: 14 }}>
          Puntos del equipo: <strong style={{ color: "var(--text)" }}>{score}</strong>
        </span>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--muted)" }}>
          <input
            type="checkbox"
            checked={generateNew}
            onChange={(e) => setGenerateNew(e.target.checked)}
            disabled={phase === "loading"}
          />
          🎬 Generar vídeo nuevo (lento · coste)
        </label>
      </div>

      {/* Stage: video / loading overlay */}
      <div
        style={{
          position: "relative",
          background: "var(--panel)",
          borderRadius: 16,
          overflow: "hidden",
          aspectRatio: "16 / 9",
          boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {clip ? (
          <video
            key={clip.videoUrl}
            src={clip.videoUrl}
            autoPlay
            loop
            muted
            controls
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ color: "var(--muted)", fontSize: 18, padding: 24, textAlign: "center" }}>
            {phase === "loading" ? loadingCopy : "Pulsa «Empezar» para que la IA actúe 🎭"}
          </div>
        )}
        {phase === "loading" && clip === null && (
          <div style={overlayStyle}>
            <div style={{ fontSize: 18, textAlign: "center", padding: 24 }}>{loadingCopy}</div>
          </div>
        )}
      </div>

      {error && <p style={{ color: "var(--accent-2)", marginTop: 16 }}>{error}</p>}

      {/* Controls */}
      {(phase === "idle" || phase === "error") && (
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button onClick={startRound} style={primaryButton()}>
            🎭 Empezar
          </button>
        </div>
      )}

      {/* Guessing */}
      {phase === "guessing" && clip && (
        <div style={{ marginTop: 20 }}>
          <p style={{ color: "var(--muted)", marginBottom: 12, textAlign: "center" }}>
            ¿Qué crees que está representando la IA? · Intento {attemptNo}/{MAX_ATTEMPTS}
          </p>
          <form onSubmit={submitGuess} style={{ display: "flex", gap: 8 }}>
            <input
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Escribe tu respuesta…"
              autoFocus
              disabled={busy}
              style={inputStyle}
            />
            <button type="submit" disabled={busy || !guess.trim()} style={primaryButton(busy)}>
              Enviar
            </button>
          </form>
        </div>
      )}

      {/* Attempts history */}
      {attempts.length > 0 && (
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          {attempts.map((a, i) => (
            <div key={i} style={attemptRow(a.hit)}>
              <span>{a.hit ? "✅" : "❌"} {a.guess}</span>
              {a.hit && <strong>+{a.points}</strong>}
            </div>
          ))}
        </div>
      )}

      {/* Result */}
      {phase === "result" && result && (
        <div style={resultPanel}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {result.hit ? "🎉 ¡Acertaste!" : "🙈 Se acabaron los intentos"}
          </div>
          {result.answer && (
            <div style={{ marginTop: 8, color: "var(--muted)" }}>
              La IA representaba: <strong style={{ color: "var(--text)" }}>{result.answer}</strong>
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 18 }}>
            {result.points > 0 ? `+${result.points} puntos` : "0 puntos"}
          </div>
          <button onClick={startRound} style={{ ...primaryButton(), marginTop: 20 }}>
            ➡️ Siguiente ronda
          </button>
        </div>
      )}
    </div>
  );
}

/* ---- fetch helpers ---- */

async function getJson(url: string): Promise<Record<string, any>> {
  const res = await fetch(url);
  return res.json();
}

async function postJson(url: string, body: unknown): Promise<Record<string, any>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ---- inline styles (reuse design tokens from globals.css) ---- */

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.55)",
};

function primaryButton(busy = false): React.CSSProperties {
  return {
    background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    padding: "14px 28px",
    fontSize: 17,
    fontWeight: 700,
    opacity: busy ? 0.6 : 1,
  };
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: "var(--panel)",
  color: "var(--text)",
  border: "1px solid var(--muted)",
  borderRadius: 999,
  padding: "12px 18px",
  fontSize: 15,
};

function attemptRow(hit: boolean): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "var(--panel)",
    border: `1px solid ${hit ? "rgba(70,211,105,0.5)" : "var(--muted)"}`,
    borderRadius: 12,
    padding: "10px 16px",
  };
}

const resultPanel: React.CSSProperties = {
  marginTop: 24,
  textAlign: "center",
  background: "linear-gradient(135deg, rgba(124,92,255,0.18), rgba(255,92,138,0.12))",
  border: "1px solid rgba(124,92,255,0.35)",
  borderRadius: 16,
  padding: "24px 20px",
};
