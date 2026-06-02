"use client";

import { useState } from "react";
import CardDeck from "./CardDeck";
import CameraCapture from "./CameraCapture";
import type { Movie } from "../data/movies";

/**
 * Orquesta el flujo de juego en una sola pantalla:
 *   1. Baraja de cartas (CardDeck) → el jugador roba un papel.
 *   2. Al confirmar, sube al escenario (CameraCapture): cuenta atrás de
 *      preparación + grabación del clip que adivina la IA.
 *   3. "Robar otra carta" vuelve a la baraja.
 */
export default function GameFlow() {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [onStage, setOnStage] = useState(false);

  if (onStage && movie) {
    return (
      <CameraCapture
        movie={movie}
        onPlayAgain={() => {
          setOnStage(false);
          setMovie(null);
        }}
      />
    );
  }

  return (
    <div className="deck-frame">
      <CardDeck
        onPick={setMovie}
        onContinue={(m) => {
          setMovie(m);
          setOnStage(true);
        }}
      />
    </div>
  );
}
