# Spec — Turno de la IA: vídeo generativo (roles invertidos)

> **Owner:** Alex · **Rama:** `feat/ai-acting-video` · **Estado:** Draft

## 1. Objetivo
Implementar el **turno de la IA** (roles invertidos del PRD §11): tras la ronda en la que la IA
adivina la mímica del humano, la **IA "actúa"** mostrando un **vídeo** y el **humano adivina** qué
representa. Por defecto reproduce un **clip pre-generado** (coste cero, instantáneo); opcionalmente
**genera uno nuevo en vivo** con un modelo **text-to-video (Veo de Gemini)**. Sigue siendo
cooperativo: el equipo (humano + IA) suma puntos juntos.

## 2. Alcance
- **Incluye:** librería curada de prompts de escena (escena → respuesta → aliases), endpoint para
  servir un clip pre-generado aleatorio, endpoint asíncrono de generación con Veo (+ polling),
  **matching server-side** del intento del humano (escena libre, tolerante), pantalla del turno de
  la IA y un banco de pruebas en `/ai-turn`. Script offline para pre-generar y commitear clips.
- **NO incluye (out of scope):** orquestación global de fases del juego (→ 01), reconocimiento de
  la mímica humana (→ 03), las cartas de película / `scoreRound` (→ 04). El matching de **este**
  turno es **free-form** y vive aquí, separado de `scoreRound` de 04.

## 3. Interfaces / Contratos
> La respuesta correcta y sus aliases **nunca** se envían al cliente antes del reveal: el matching
> es **server-side**. Los nombres de fichero de los clips son **opacos** (`p01.mp4`, no
> `dinosaurio.mp4`) para no spoilear.

### Expone (lo que otros consumen de mí)
```ts
// GET /api/ai-clip  → sortea un clip PRE-GENERADO disponible para el turno de la IA
type AiClip = { promptId: string; videoUrl: string; source: 'pregenerated' };
type AiClipResponse =
  | { clip: AiClip }
  | { clip: null; message: string }; // no hay clips pre-generados → sugerir 'generar nuevo'

// POST /api/ai-clip/generate  { promptId?: string }
//   omitir promptId = elige uno aleatorio. Arranca un job de Veo (asíncrono).
type GenerateStart = { jobId: string; promptId: string; status: 'pending' };

// GET /api/ai-clip/generate?jobId=...   → polling del job
type GenerateStatus =
  | { status: 'pending' }
  | { status: 'done'; videoUrl: string; promptId: string; source: 'generated' }
  | { status: 'error'; message: string };

// GET /api/ai-clip/file?jobId=...   → stream del MP4 generado en memoria (video/mp4)

// POST /api/ai-clip/guess  { promptId: string; guess: string; attempt: number }
//   matching tolerante del intento del humano contra los aliases del prompt.
type AiGuessResponse = {
  hit: boolean;
  attempt: number;
  points: number;     // 100 / 60 / 30 / 0 según intento (consistente con PRD §6)
  answer?: string;    // SOLO al acertar o agotar los 3 intentos (reveal)
};
```

### Consume (lo que necesito de otros componentes)
- De **01:** integración de las fases del turno IA en la máquina `GamePhase` y la acumulación
  cooperativa al marcador. Mientras tanto `/ai-turn` permite demostrar el turno de forma aislada.
- De **03 (mismo owner):** `lib/gemini.ts` (`getGemini()`), el **cliente `@google/genai` compartido**.
- De **04:** misma normalización (minúsculas, sin acentos/signos) y misma escala de puntos. El
  matching free-form de este turno vive aquí (no usa `scoreRound`).

## 4. Diseño técnico
- **Núcleo en `lib/video/`:**
  - `prompts.data.json` — datos de la librería (`{ id, prompt, answer, accept, clip }[]`). Lo
    comparten el backend (TS) y el script de pre-generación (`.mjs`).
  - `prompts.ts` — tipos + `pickRandomPrompt()`, `pickRandomWithClip()`, `getPrompt(id)`,
    `publicPrompt(p)` (versión sin `answer`/`accept` para no spoilear). **Solo server-side.**
  - `matcher.ts` — `normalize()` (minúsculas, sin acentos/signos), `matches(guess, accept[])`
    (tolerante: igualdad/inclusión), `pointsFor(attempt)` (100/60/30/0).
  - `veo.ts` — `generateClip(prompt)`: `ai.models.generateVideos({ model, prompt, config })` y
    polling con `ai.operations.getVideosOperation`; descarga el MP4 (vía `videoBytes` base64 o
    `uri`+`&key=`). Modelo de `VEO_MODEL` (por defecto `veo-3.0-fast-generate-001`).
  - `jobs.ts` — `Map<jobId, { status, promptId, bytes?, error? }>` en memoria + caché por
    `promptId` (regenerar el mismo prompt reutiliza el resultado → ahorro de coste).
- **Rutas (App Router, `runtime = "nodejs"`):** `app/api/ai-clip/{route,generate/route,guess/route,file/route}.ts`.
- **Frontend:** `app/components/AiActingStage.tsx` (fases internas
  `loading | showing | guessing | result | error`, ≤3 intentos, toggle "🎬 Generar vídeo nuevo")
  reutilizando los tokens de diseño de `globals.css`. `app/ai-turn/page.tsx` es el banco de pruebas.
- **Pre-generados:** `scripts/pregenerate-clips.mjs` recorre `prompts.data.json`, llama a Veo y
  guarda cada MP4 en `public/ai-clips/<id>.mp4` (servido estáticamente) rellenando `clip`. Se
  ejecuta **una vez** y se **commitean** los `.mp4`.
- **Modelo / claves:** `VEO_MODEL` (default `veo-3.0-fast-generate-001`), `GEMINI_API_KEY`
  (fallback `GOOGLE_API_KEY`). El camino pre-generado **no requiere clave** en runtime.

## 5. Dependencias
- **De 03:** `lib/gemini.ts`. **Externas:** `@google/genai` (Veo: `generateVideos` +
  `operations.getVideosOperation`), `GEMINI_API_KEY`.
- **De 01/04:** integración de fases y consistencia de puntuación (coordinación pendiente).

## 6. Criterios de aceptación
- [ ] `GET /api/ai-clip` devuelve un clip pre-generado aleatorio (o `clip: null` con mensaje claro
      si aún no hay clips commiteados), con `videoUrl` y `promptId` **sin revelar** la respuesta.
- [ ] `POST /api/ai-clip/generate` arranca un job de Veo y `GET …?jobId` hace polling hasta `done`,
      sirviendo el MP4 por `/api/ai-clip/file`.
- [ ] `POST /api/ai-clip/guess` acierta el matching con variantes razonables y devuelve puntos
      100/60/30/0; la `answer` solo aparece al acertar o agotar los 3 intentos.
- [ ] `/ai-turn` permite: ver el clip, escribir intentos (≤3), reveal + puntos, y "siguiente".
- [ ] El camino pre-generado funciona **sin** `GEMINI_API_KEY`.
- [ ] Clave fuera del repo (`.env`); `.mp4` con nombres opacos.

## 7. Riesgos / preguntas abiertas
- **Latencia/coste de Veo:** la generación tarda decenas de segundos a minutos y es de pago; de ahí
  el default pre-generado + caché por `promptId`. Copy de carga claro ("la IA dibuja… ~1 min").
- **FS / serverless:** los clips generados se sirven desde memoria vía `/api/ai-clip/file` (no se
  escribe en `public/` en runtime); el store en memoria no persiste entre reinicios/workers.
- **Peso del repo:** ~5-8 `.mp4` de pocos MB; aceptable para la demo (considerar git-lfs si crece).
- **`personGeneration` de Veo:** elegir valor (`dont_allow` / `allow_adult`) que evite bloqueos.
- **Integración con 01:** acordar las fases del turno IA (p. ej. `ai_prepare | ai_showing |
  ai_guessing | ai_result`) y la alternancia humano↔IA.
