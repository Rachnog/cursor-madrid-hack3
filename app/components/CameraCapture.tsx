"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PREP_SECONDS = 5; // cuenta atrás de preparación (film leader)
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
      setClipUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setPhase("done");
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
      {/* Escenario: fotograma con perforaciones de película */}
      <div className="stage">
        <div className="sprockets">
          {Array.from({ length: 6 }).map((_, i) => (
            <i key={i} />
          ))}
        </div>

        <div className="viewport">
          <video ref={liveVideoRef} className="video-live" autoPlay muted playsInline />

          {phase === "countdown" && (
            <div className="overlay">
              <div className="leader">
                <div className="leader-sweep" />
                <div className="leader-num">{count}</div>
              </div>
              <div className="overlay-label">Prepárate</div>
            </div>
          )}

          {phase === "recording" && (
            <div className="rolling">
              <span className="dot" />
              RODANDO · {count}s
            </div>
          )}
        </div>

        <div className="sprockets">
          {Array.from({ length: 6 }).map((_, i) => (
            <i key={i} />
          ))}
        </div>
      </div>

      {error && <p className="error-note" style={{ marginTop: 18 }}>{error}</p>}

      <button
        className="act-btn"
        onClick={startCountdown}
        disabled={busy || phase === "error"}
      >
        {phase === "done" ? "¡Otra función!" : busy ? "En escena…" : "¡Acción!"}
      </button>

      {/* Resultado de la IA como intertítulo */}
      {phase === "done" && aiPhase === "loading" && (
        <div className="thinking">
          <div className="reel" />
          <span>
            El público observa
            <span className="thinking-dots" />
          </span>
        </div>
      )}

      {phase === "done" && aiPhase === "error" && (
        <div className="intertitle">
          <p className="intertitle-lead">Se fundió la película</p>
          <p className="error-note">⚠ {aiError}</p>
          <button
            className="act-btn"
            style={{ marginTop: 24 }}
            onClick={() => {
              void (async () => {
                const res = await fetch(clipUrl!);
                const blob = await res.blob();
                void sendToGemini(blob);
              })();
            }}
          >
            Rebobinar
          </button>
        </div>
      )}

      {phase === "done" && aiPhase === "done" && result && result.guesses.length > 0 && (
        <div className="intertitle">
          <p className="intertitle-lead">El público cree que has actuado…</p>
          <div className="guess-main">«{result.guesses[0]}»</div>

          {result.guesses.length > 1 && (
            <>
              <p className="guess-or">…o quizá fuese:</p>
              {result.guesses.slice(1).map((g, i) => (
                <p key={i} className="guess-alt">{g}</p>
              ))}
            </>
          )}

          {result.reasoning && (
            <p className="director-note">— Nota del director: {result.reasoning}</p>
          )}
        </div>
      )}

      {/* Clip grabado */}
      {phase === "done" && clipUrl && (
        <div className="clip">
          <video
            src={clipUrl}
            controls
            playsInline
            onLoadedMetadata={fixWebmDuration}
          />
          <div>
            <a className="download" href={clipUrl} download="charades-clip.webm">
              ⬇ Descargar la cinta (.webm)
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// MediaRecorder genera WebM sin la metadata de duración, así que el reproductor
// muestra una duración incorrecta. Forzamos un "seek" al final para que el navegador
// recalcule la duración real y luego volvemos al inicio.
function fixWebmDuration(e: React.SyntheticEvent<HTMLVideoElement>) {
  const video = e.currentTarget;
  if (video.duration !== Infinity && !Number.isNaN(video.duration)) return;
  const onUpdate = () => {
    video.removeEventListener("timeupdate", onUpdate);
    video.currentTime = 0;
  };
  video.addEventListener("timeupdate", onUpdate);
  video.currentTime = 1e101; // el navegador lo limita al final real del clip
}
