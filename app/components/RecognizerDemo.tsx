"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Domain, RecognizeResponse, RecognizeStatus } from "@/lib/types";

const MAX_RECORD_SECONDS = 12; // auto-stop so clips stay small and fast to process

type Phase = "init" | "ready" | "recording" | "thinking" | "error";

interface AiTurn {
  id: number;
  kind: "you" | "ai";
  text: string;
  status?: RecognizeStatus;
  label?: string;
  confidence?: number;
  clarifyingQuestion?: string;
}

function pickMimeType(): string {
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "video/webm";
}

const STATUS_META: Record<RecognizeStatus, { icon: string; label: string; color: string }> = {
  guess: { icon: "✅", label: "Adivinanza", color: "#46d369" },
  need_clarification: { icon: "❓", label: "Aclaración", color: "var(--accent)" },
  ask_for_new_video: { icon: "🔁", label: "Vídeo nuevo", color: "var(--accent-2)" },
};

export default function RecognizerDemo() {
  const [phase, setPhase] = useState<Phase>("init");
  const [turns, setTurns] = useState<AiTurn[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [domain, setDomain] = useState<Domain>("object");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timersRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const nextId = useRef(1);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearInterval);
    timersRef.current = [];
  }, []);

  const addTurn = useCallback((turn: Omit<AiTurn, "id">) => {
    setTurns((prev) => [...prev, { ...turn, id: nextId.current++ }]);
  }, []);

  // Ask for the camera once and show a live, mirrored preview.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (liveVideoRef.current) liveVideoRef.current.srcObject = stream;
        setPhase("ready");
      } catch (err) {
        console.error(err);
        setError("No se pudo acceder a la cámara. Revisa los permisos del navegador.");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
      clearTimers();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [clearTimers]);

  const send = useCallback(
    async (opts: { video?: Blob; text?: string }) => {
      setError(null);
      setPhase("thinking");
      const turnLabel = opts.video
        ? sessionId
          ? "📹 Otro vídeo del mismo objeto"
          : "📹 Vídeo enviado"
        : `💬 ${opts.text ?? ""}`;
      addTurn({ kind: "you", text: turnLabel });

      try {
        const form = new FormData();
        if (opts.video) form.append("video", opts.video, "clip.webm");
        if (opts.text) form.append("text", opts.text);
        if (sessionId) form.append("sessionId", sessionId);
        else form.append("domain", domain);

        const res = await fetch("/api/recognize", { method: "POST", body: form });
        const data: RecognizeResponse & { error?: string } = await res.json();
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

        setSessionId(data.sessionId);
        addTurn({
          kind: "ai",
          text: data.message,
          status: data.status,
          label: data.label,
          confidence: data.confidence,
          clarifyingQuestion: data.clarifyingQuestion,
        });
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Error inesperado.");
      } finally {
        setPhase("ready");
      }
    },
    [addTurn, domain, sessionId]
  );

  const stopRecording = useCallback(() => {
    clearTimers();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, [clearTimers]);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: pickMimeType() });
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      if (blob.size > 0) void send({ video: blob });
    };

    recorder.start();
    setPhase("recording");
    setElapsed(0);
    const interval = setInterval(() => {
      setElapsed((s) => {
        if (s + 1 >= MAX_RECORD_SECONDS) {
          clearInterval(interval);
          if (recorder.state !== "inactive") recorder.stop();
          return MAX_RECORD_SECONDS;
        }
        return s + 1;
      });
    }, 1000);
    timersRef.current.push(interval);
  }, [send]);

  const resetConversation = useCallback(() => {
    setSessionId(null);
    setTurns([]);
    setReply("");
    setError(null);
  }, []);

  const lastAi = [...turns].reverse().find((t) => t.kind === "ai");
  const awaitingReply = lastAi?.status === "need_clarification";
  const busy = phase === "recording" || phase === "thinking" || phase === "init";

  return (
    <div>
      {/* Camera preview */}
      <div
        style={{
          position: "relative",
          background: "var(--panel)",
          borderRadius: 16,
          overflow: "hidden",
          aspectRatio: "16 / 9",
          boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
        }}
      >
        <video
          ref={liveVideoRef}
          autoPlay
          muted
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
        />
        {phase === "recording" && (
          <div style={pillStyle}>
            <span style={dotStyle} /> REC · {elapsed}s
          </div>
        )}
        {phase === "thinking" && (
          <div style={overlayStyle}>
            <div style={{ fontSize: 18 }}>🤖 La IA está pensando…</div>
          </div>
        )}
      </div>

      {/* Domain selector — only before the conversation starts */}
      {!sessionId && turns.length === 0 && (
        <div style={{ marginTop: 20, display: "flex", gap: 8, justifyContent: "center" }}>
          {(["object", "movie"] as Domain[]).map((d) => (
            <button
              key={d}
              onClick={() => setDomain(d)}
              disabled={busy}
              style={toggleStyle(domain === d)}
            >
              {d === "object" ? "🧩 Objeto" : "🎬 Película (charadas)"}
            </button>
          ))}
        </div>
      )}

      {/* Primary controls */}
      <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        {phase === "recording" ? (
          <button onClick={stopRecording} style={primaryButton(true)}>
            ⏹ Parar
          </button>
        ) : (
          <button onClick={startRecording} disabled={busy || phase === "error"} style={primaryButton(false, busy)}>
            {phase === "thinking"
              ? "Pensando…"
              : sessionId
                ? "🔁 Grabar otra vez (mismo objeto)"
                : "🎬 Grabar"}
          </button>
        )}
        {sessionId && phase !== "recording" && (
          <button onClick={resetConversation} disabled={phase === "thinking"} style={ghostButton}>
            ✨ Objeto nuevo
          </button>
        )}
      </div>

      {/* Reply-by-text box when the AI asked a clarifying question */}
      {awaitingReply && phase !== "recording" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const text = reply.trim();
            if (!text) return;
            setReply("");
            void send({ text });
          }}
          style={{ marginTop: 16, display: "flex", gap: 8 }}
        >
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Responde a la pregunta de la IA…"
            disabled={phase === "thinking"}
            style={inputStyle}
          />
          <button type="submit" disabled={phase === "thinking" || !reply.trim()} style={ghostButton}>
            Enviar
          </button>
        </form>
      )}

      {error && <p style={{ color: "var(--accent-2)", marginTop: 16 }}>{error}</p>}

      {/* Conversation transcript */}
      {turns.length > 0 && (
        <div style={{ marginTop: 28, textAlign: "left", display: "flex", flexDirection: "column", gap: 12 }}>
          {turns.map((t) =>
            t.kind === "you" ? (
              <div key={t.id} style={youBubble}>
                {t.text}
              </div>
            ) : (
              <div key={t.id} style={aiBubble}>
                {t.status && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={badge(STATUS_META[t.status].color)}>
                      {STATUS_META[t.status].icon} {STATUS_META[t.status].label}
                    </span>
                    {t.label && (
                      <strong style={{ fontSize: 16 }}>
                        {t.label}
                        {typeof t.confidence === "number" && (
                          <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                            {" "}
                            · {Math.round(t.confidence * 100)}%
                          </span>
                        )}
                      </strong>
                    )}
                  </div>
                )}
                <div>{t.text}</div>
                {t.clarifyingQuestion && (
                  <div style={{ marginTop: 6, color: "var(--muted)" }}>❓ {t.clarifyingQuestion}</div>
                )}
              </div>
            )
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}

/* ---- inline styles (reuse the shared design tokens from globals.css) ---- */

const pillStyle: React.CSSProperties = {
  position: "absolute",
  top: 16,
  left: 16,
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "rgba(0,0,0,0.55)",
  padding: "8px 14px",
  borderRadius: 999,
  fontWeight: 700,
};

const dotStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: "50%",
  background: "var(--accent-2)",
  animation: "pulse 1s infinite",
};

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.45)",
};

function primaryButton(stop: boolean, busy = false): React.CSSProperties {
  return {
    background: stop ? "var(--accent-2)" : "linear-gradient(90deg, var(--accent), var(--accent-2))",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    padding: "14px 28px",
    fontSize: 17,
    fontWeight: 700,
    opacity: busy ? 0.6 : 1,
  };
}

const ghostButton: React.CSSProperties = {
  background: "transparent",
  color: "var(--text)",
  border: "1px solid var(--muted)",
  borderRadius: 999,
  padding: "12px 22px",
  fontSize: 15,
  fontWeight: 600,
};

function toggleStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? "var(--accent)" : "transparent",
    color: active ? "#fff" : "var(--muted)",
    border: `1px solid ${active ? "var(--accent)" : "var(--muted)"}`,
    borderRadius: 999,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
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

const youBubble: React.CSSProperties = {
  alignSelf: "flex-end",
  background: "var(--panel)",
  borderRadius: "16px 16px 4px 16px",
  padding: "10px 16px",
  maxWidth: "85%",
  color: "var(--muted)",
};

const aiBubble: React.CSSProperties = {
  alignSelf: "flex-start",
  background: "linear-gradient(135deg, rgba(124,92,255,0.18), rgba(255,92,138,0.12))",
  border: "1px solid rgba(124,92,255,0.35)",
  borderRadius: "16px 16px 16px 4px",
  padding: "12px 16px",
  maxWidth: "90%",
};

function badge(color: string): React.CSSProperties {
  return {
    background: color,
    color: "#0f0f1a",
    borderRadius: 999,
    padding: "2px 10px",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  };
}
