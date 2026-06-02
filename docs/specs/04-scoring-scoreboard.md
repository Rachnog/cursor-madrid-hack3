# Spec — Puntuación, scoreboard & datos de películas

> **Owner:** Jesús · **Rama:** `feat/scoring-scoreboard` · **Estado:** Draft

## 1. Objetivo
Proveer los datos de películas (4 cartas por ronda), comparar la adivinanza de la IA
con el objetivo, calcular la puntuación y mantener el scoreboard.

## 2. Alcance
- **Incluye:** dataset de películas, generación de 4 cartas sin repetición, matching
  tolerante (mayúsculas/acentos/variantes), cálculo de puntos, persistencia y
  consulta del scoreboard.
- **NO incluye:** UI (→ 01), llamada a Gemini (→ 03), captura (→ 02).

## 3. Interfaces / Contratos
### Expone
```ts
// GET /api/cards  → 4 títulos aleatorios sin repetir en la partida
type CardsResponse = { cards: { id: string; title: string }[] };

// función de matching + puntuación
function scoreRound(target: string, guesses: string[]): { hit: boolean; attempt: number; points: number };

// scoreboard
// POST /api/score { name, points }   ·   GET /api/score → top N
type ScoreEntry = { name: string; points: number };
```
### Consume
- De **03:** `guesses` para hacer el matching.
- De **01:** nombre del jugador y eventos de fin de ronda/partida.

## 4. Diseño técnico
Dataset JSON de títulos populares. Normalización (minúsculas, sin acentos/signos)
para el matching. Puntuación: 100/60/30 según intento (ver PRD). Scoreboard en
fichero/SQLite/Supabase (MVP: fichero o memoria).

## 5. Dependencias
- Forma de `guesses` con **03**.

## 6. Criterios de aceptación
- [ ] `/api/cards` devuelve 4 títulos únicos.
- [ ] `scoreRound` acierta el matching con variantes razonables.
- [ ] Scoreboard persiste y devuelve el top N ordenado.

## 7. Riesgos / preguntas abiertas
- Umbral de similitud del matching (exacto vs fuzzy).
- ¿Scoreboard global persistente o por sesión?
