"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PREP_SECONDS = 5; // cuenta atrás de preparación
const RECORD_SECONDS = 10; // duración de la grabación

type Phase = "idle" | "countdown" | "recording" | "done" | "error";
type AiPhase = "idle" | "loading" | "done" | "error";

interface GuessResult {
  guesses: string[];
  reasoning?: string;
  model?: string;
}

function pickMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "video/webm";
}

export default function CameraCapture() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(0); // segundos restantes de la fase actual
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estado de la adivinanza de la IA
  const [aiPhase, setAiPhase] = useState<AiPhase>("idle");
  const [result, setResult] = useState<GuessResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timersRef = useRef<ReturnType<typeof setInterval>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearInterval);
    timersRef.current = [];
  }, []);

  // Envía el clip grabado a Gemini y muestra las adivinanzas.
  const sendToGemini = useCallback(async (blob: Blob) => {
    setAiPhase("loading");
    setAiError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("video", blob, "charades.webm");
      const res = await fetch("/api/guess", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error en el servidor");
      setResult(data as GuessResult);
      setAiPhase("done");
    } catch (err) {
      console.error(err);
      setAiError(err instanceof Error ? err.message : "Error desconocido");
      setAiPhase("error");
    }
  }, []);

  // Pide la cámara al montar y muestra el preview en vivo.
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
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError(
          "No se pudo acceder a la cámara. Revisa los permisos del navegador."
        );
        setPhase("error");
        console.error(err);
      }
    })();

    return () => {
      cancelled = true;
      clearTimers();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
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
      // Libera el clip anterior si existía.
      setClipUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setPhase("done");
      // Manda automáticamente el clip a la IA.
      void sendToGemini(blob);
    };

    recorder.start();
    setPhase("recording");
    setCount(RECORD_SECONDS);

    const interval = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(interval);
          if (recorder.state !== "inactive") recorder.stop();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    timersRef.current.push(interval);
  }, [sendToGemini]);

  const startCountdown = useCallback(() => {
    // Limpia un clip y resultado previos.
    setClipUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setResult(null);
    setAiPhase("idle");
    setAiError(null);
    setPhase("countdown");
    setCount(PREP_SECONDS);

    const interval = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(interval);
          startRecording();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    timersRef.current.push(interval);
  }, [startRecording]);

  const busy = phase === "countdown" || phase === "recording";

  return (
    <div>
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
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "scaleX(-1)", // efecto espejo, más natural
          }}
        />

        {/* Overlay de cuenta atrás / grabación */}
        {phase === "countdown" && (
          <Overlay>
            <div style={{ fontSize: 18, color: "var(--muted)" }}>Prepárate…</div>
            <div style={{ fontSize: 120, fontWeight: 800, lineHeight: 1 }}>
              {count}
            </div>
          </Overlay>
        )}
        {phase === "recording" && (
          <div
            style={{
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
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "var(--accent-2)",
                animation: "pulse 1s infinite",
              }}
            />
            REC · {count}s
          </div>
        )}
      </div>

      {error && (
        <p style={{ color: "var(--accent-2)", marginTop: 16 }}>{error}</p>
      )}

      <div style={{ marginTop: 24 }}>
        <button
          onClick={startCountdown}
          disabled={busy || phase === "error"}
          style={{
            background: busy
              ? "var(--muted)"
              : "linear-gradient(90deg, var(--accent), var(--accent-2))",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "14px 32px",
            fontSize: 18,
            fontWeight: 700,
            opacity: busy ? 0.6 : 1,
          }}
        >
          {phase === "done"
            ? "🔁 Jugar otra vez"
            : busy
            ? "Grabando…"
            : "🎬 Empezar"}
        </button>
      </div>

      {/* Resultado de la IA */}
      {phase === "done" && (
        <div style={{ marginTop: 32 }}>
          {aiPhase === "loading" && (
            <div style={{ color: "var(--muted)", fontSize: 18 }}>
              🤖 La IA está pensando…
            </div>
          )}

          {aiPhase === "error" && (
            <div style={{ color: "var(--accent-2)" }}>
              ⚠️ {aiError}
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => {
                    void (async () => {
                      const res = await fetch(clipUrl!);
                      const blob = await res.blob();
                      void sendToGemini(blob);
                    })();
                  }}
                  style={retryBtn}
                >
                  Reintentar
                </button>
              </div>
            </div>
          )}

          {aiPhase === "done" && result && (
            <div
              style={{
                background: "var(--panel)",
                borderRadius: 16,
                padding: 24,
                textAlign: "left",
              }}
            >
              <h2 style={{ fontSize: 20, marginBottom: 16 }}>
                🤖 La IA cree que es…
              </h2>
              <ol style={{ paddingLeft: 0, listStyle: "none" }}>
                {result.guesses.map((g, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom:
                        i < result.guesses.length - 1
                          ? "1px solid rgba(255,255,255,0.08)"
                          : "none",
                      fontSize: i === 0 ? 22 : 18,
                      fontWeight: i === 0 ? 700 : 500,
                    }}
                  >
                    <span
                      style={{
                        opacity: 0.5,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {i + 1}.
                    </span>
                    {g}
                  </li>
                ))}
              </ol>
              {result.reasoning && (
                <p
                  style={{
                    marginTop: 16,
                    color: "var(--muted)",
                    fontStyle: "italic",
                    fontSize: 14,
                  }}
                >
                  💭 {result.reasoning}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reproductor + descarga del clip */}
      {phase === "done" && clipUrl && (
        <div style={{ marginTop: 24 }}>
          <video
            src={clipUrl}
            controls
            playsInline
            style={{ width: "100%", borderRadius: 16, background: "#000" }}
          />
          <a
            href={clipUrl}
            download="charades-clip.webm"
            style={{
              display: "inline-block",
              marginTop: 12,
              color: "var(--accent)",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            ⬇️ Descargar clip (.webm)
          </a>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

const retryBtn: React.CSSProperties = {
  background: "var(--accent)",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  padding: "8px 20px",
  fontWeight: 700,
};

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        background: "rgba(0,0,0,0.45)",
        textShadow: "0 2px 12px rgba(0,0,0,0.6)",
      }}
    >
      {children}
    </div>
  );
}
