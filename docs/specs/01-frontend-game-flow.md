# Spec — Frontend & flujo de juego

> **Owner:** Mauricio · **Rama:** `feat/frontend-game-flow` · **Estado:** Draft

## 1. Objetivo
UI web de una sola pantalla que orquesta el flujo del juego: entrada del jugador,
selección de cartas, countdowns y visualización de resultados/puntuación.

## 2. Alcance
- **Incluye:** pantalla de inicio (nombre), grid de 4 cartas, countdown de 5 s
  (preparación) y 10 s (actuación), estados de "IA pensando", resultado de ronda,
  marcador de partida y vista de scoreboard.
- **NO incluye:** acceso a la cámara/captura de frames (→ 02), llamadas a Gemini
  (→ 03), lógica de puntuación ni persistencia del scoreboard (→ 04).

## 3. Interfaces / Contratos
### Expone
```ts
// Máquina de estados del juego (orienta a los demás componentes)
type GamePhase = 'idle' | 'choosing' | 'prepare' | 'acting' | 'guessing' | 'result';
```
### Consume
- De **02 (cámara):** componente/hook de captura y señal de "frames listos".
- De **03 (IA):** resultado de adivinanza (título, intento, acierto).
- De **04 (puntuación):** cartas de la ronda, puntos de ronda y total, scoreboard.

## 4. Diseño técnico
Next.js + React + TypeScript. Componente raíz con state machine de `GamePhase`.
Timers visuales para los countdowns. Diseño limpio y demo-friendly.

## 5. Dependencias
Contratos de 02, 03 y 04 (acordar payloads pronto).

## 6. Criterios de aceptación
- [ ] El flujo completo se puede recorrer end-to-end con datos mock.
- [ ] Countdowns de 5 s y 10 s claros y fiables.
- [ ] Estados de carga ("IA pensando…") y resultado bien señalizados.

## 7. Riesgos / preguntas abiertas
- Sincronización de los countdowns con el inicio/fin de la captura.
