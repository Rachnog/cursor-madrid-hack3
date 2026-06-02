"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { CARD_BACK, MOVIES, type Movie } from "../data/movies";
import styles from "./CardDeck.module.css";

type Phase = "fan" | "revealed";

const CARD_COUNT = MOVIES.length;
const MID = (CARD_COUNT - 1) / 2;
const STEP = 56 / (CARD_COUNT - 1); // total fan ≈ 56°
const CARD_RATIO = 1.6; // must match --card-ratio in the CSS module

// Size the fan card to the stage WIDTH, then pick a hero scale that fills the HEIGHT.
function computeFit(w: number, h: number) {
  const cw = Math.max(96, Math.min(300, w * 0.4, (h * 0.62) / CARD_RATIO));
  const hero = Math.max(1.2, Math.min(2.8, (h * 0.94) / (cw * CARD_RATIO)));
  return { cw: Math.round(cw), hero: Math.round(hero * 100) / 100 };
}

function shuffledOrder(): number[] {
  const a = MOVIES.map((_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface CardDeckProps {
  /** Called with the drawn movie when the user reveals a card. */
  onPick?: (movie: Movie) => void;
  /** Called when the player confirms the revealed card and steps on stage. */
  onContinue?: (movie: Movie) => void;
}

/**
 * A responsive, bottom-anchored card-fan. The user sees the backs of every
 * card, taps one, and it flips to reveal a movie. Pure React + CSS (no deps).
 */
export default function CardDeck({ onPick, onContinue }: CardDeckProps) {
  const [phase, setPhase] = useState<Phase>("fan");
  const [selected, setSelected] = useState<number | null>(null);
  const [deck, setDeck] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // order[i] = which movie sits in fan slot i (reshuffled each deal).
  // Empieza en orden determinista (identidad) para que SSR y cliente coincidan;
  // se baraja SOLO en el cliente tras montar (las cartas están boca abajo, así
  // que el reorden es invisible y no rompe la hidratación).
  const [order, setOrder] = useState<number[]>(() => MOVIES.map((_, i) => i));
  useEffect(() => {
    setOrder(shuffledOrder());
  }, [deck]);
  const drawn = selected != null ? MOVIES[order[selected]] : null;

  // Keep cards sized to the stage so the revealed card always fits.
  useEffect(() => {
    const stage = stageRef.current;
    const root = rootRef.current;
    if (!stage || !root) return;
    const fit = () => {
      const { cw, hero } = computeFit(stage.clientWidth, stage.clientHeight);
      root.style.setProperty("--card-w", `${cw}px`);
      root.style.setProperty("--hero", `${hero}`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  const pick = useCallback(
    (slot: number) => {
      if (phase !== "fan") return;
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(12);
      setSelected(slot);
      setPhase("revealed");
      onPick?.(MOVIES[order[slot]]);
    },
    [phase, order, onPick]
  );

  const reset = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
    setPhase("fan");
    setSelected(null);
    setDeck((d) => d + 1);
  }, []);

  return (
    <div className={styles.root} ref={rootRef}>
      <h2 className={styles.title}>El gran casting</h2>
      <p className={styles.subtitle}>
        {phase === "fan"
          ? "Roba una carta y descubre qué papelón te toca bordar"
          : drawn
          ? `«${drawn.title}» · ${
              drawn.sentiment === "positive" ? "😇 papel de buenazo" : "😈 papelón de villano"
            }`
          : ""}
      </p>

      <div
        className={`${styles.stage} ${phase === "fan" ? styles.fan : styles.revealed}`}
        ref={stageRef}
      >
        {order.map((movieIdx, slot) => {
          const movie = MOVIES[movieIdx];
          const angle = (slot - MID) * STEP;
          const isSel = selected === slot;
          return (
            <button
              key={`${deck}-${slot}`}
              className={`${styles.card} ${isSel ? styles.selected : ""}`}
              style={{ "--angle": `${angle}deg`, zIndex: isSel ? 100 : slot } as CSSProperties}
              aria-label={isSel ? `Revealed: ${movie.title}` : `Hidden card ${slot + 1}`}
              onClick={() => pick(slot)}
              disabled={phase === "revealed"}
            >
              <div className={styles.flipper}>
                <div
                  className={`${styles.face} ${styles.back}`}
                  style={{ backgroundImage: `url(${CARD_BACK})` }}
                />
                <div className={`${styles.face} ${styles.front}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={movie.image} alt={movie.title} draggable={false} loading="lazy" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className={styles.controls}>
        {phase === "revealed" && drawn && (
          <>
            <button className={styles.reset} onClick={reset}>
              Otra carta
            </button>
            <button className={styles.go} onClick={() => onContinue?.(drawn)}>
              ¡A escena! 🎬
            </button>
          </>
        )}
      </div>
    </div>
  );
}
