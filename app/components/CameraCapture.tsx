"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Movie } from "../data/movies";

const PREP_SECONDS = 5; // cuenta atrás de preparación (film leader)
const RECORD_SECONDS = 5; // duración de la grabación (clip corto → procesado más rápido)

// Resolución y bitrate reducidos a propósito: el clip pesa mucho menos, así que
// subir y procesar en Gemini es bastante más rápido (la mímica no necesita HD).
const CAPTURE_WIDTH = 640;
const CAPTURE_HEIGHT = 360;
const VIDEO_BITRATE = 800_000; // ~0.8 Mbps

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

interface CameraCaptureProps {
  /** Película que el jugador acaba de robar y debe interpretar. */
  movie: Movie;
  /** Vuelve a la baraja para robar otra carta. */
  onPlayAgain: () => void;
}

export default function CameraCapture({ movie, onPlayAgain }: CameraCaptureProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(0); // segundos restantes de la fase actual
  const [showHints, setShowHints] = useState(false); // panel de pistas de actuación
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false); // cámara lista (stream activo)
  const autoStartedRef = useRef(false); // arranca la cuenta atrás una sola vez

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
          video: { width: { ideal: CAPTURE_WIDTH }, height: { ideal: CAPTURE_HEIGHT } },
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
        setReady(true);
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
    const recorder = new MediaRecorder(stream, {
      mimeType: pickMimeType(),
      videoBitsPerSecond: VIDEO_BITRATE,
    });
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

    // El tick lleva los efectos (parar el recorder) FUERA del updater de setState:
    // en Strict Mode los updaters se invocan dos veces, así que un efecto dentro
    // se ejecutaría por duplicado (causa de la doble grabación → doble llamada IA).
    let remaining = RECORD_SECONDS;
    const interval = setInterval(() => {
      remaining -= 1;
      setCount(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        if (recorder.state !== "inactive") recorder.stop();
      }
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

    // Mismo motivo que en startRecording: el efecto (arrancar la grabación) va
    // FUERA del updater de setState. Si no, Strict Mode lo invoca dos veces y se
    // crean dos MediaRecorder sobre el mismo stream/chunks → clip truncado (~2s)
    // y doble llamada a Gemini.
    let remaining = PREP_SECONDS;
    const interval = setInterval(() => {
      remaining -= 1;
      setCount(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        startRecording();
      }
    }, 1000);
    timersRef.current.push(interval);
  }, [startRecording]);

  // En cuanto la cámara está lista, arranca sola la cuenta atrás de preparación:
  // el jugador ya ha visto su carta, ahora se prepara para actuar.
  useEffect(() => {
    if (ready && !autoStartedRef.current && phase === "idle") {
      autoStartedRef.current = true;
      startCountdown();
    }
  }, [ready, phase, startCountdown]);

  const busy = phase === "countdown" || phase === "recording";

  return (
    <div>
      {/* Carta robada: el papel que toca interpretar */}
      {phase !== "done" && (
        <div className="role">
          <p className="role-kicker">Te toca interpretar</p>
          <p className="role-title">«{movie.title}»</p>
          <p className="role-hint">
            Protagonista: Pedro Sánchez · {movie.sentiment === "positive" ? "papel de buenazo 😇" : "papelón de villano 😈"}
          </p>

          {movie.hints.length > 0 && (
            <div className="hints">
              <button
                type="button"
                className="hints-toggle"
                aria-expanded={showHints}
                onClick={() => setShowHints((v) => !v)}
              >
                💡 {showHints ? "Ocultar pistas" : "¿No sabes cómo actuarla? Pistas"}
              </button>
              {showHints && (
                <ul className="hints-list">
                  {movie.hints.map((hint, i) => (
                    <li key={i}>{hint}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

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

      {phase === "error" ? (
        <button className="act-btn" onClick={onPlayAgain}>
          Volver a la baraja
        </button>
      ) : phase === "done" ? (
        <button className="act-btn" onClick={onPlayAgain}>
          Robar otra carta
        </button>
      ) : (
        <button className="act-btn" disabled>
          {phase === "recording" ? "¡Rodando!" : phase === "countdown" ? "En escena…" : "Encendiendo focos…"}
        </button>
      )}

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

    </div>
  );
}
