# Spec — Integración IA / Gemini (backend de adivinanza)

> **Owner:** Alex · **Rama:** `feat/gemini-integration` · **Estado:** v1 implementada

## ✅ Implementación v1 (vídeo completo, no frames)

Decisión tomada: en vez de muestrear frames, se envía el **clip de vídeo completo**
(`.webm`) inline (base64) a Gemini. Un clip de 10s pesa pocos MB, muy por debajo del
límite de ~100MB por request, así que es más simple y conserva el movimiento.

- **SDK:** `@google/genai` v2.x · `new GoogleGenAI({ apiKey })`.
- **Modelo:** `gemini-2.5-flash` (override con env `GEMINI_MODEL`).
- **Endpoint:** `POST /api/guess` — recibe `FormData` con campo `video` (Blob webm),
  devuelve `{ guesses: string[3], reasoning: string, model: string }`.
- **Salida estructurada:** `responseMimeType: application/json` + `responseSchema`.
- La `GEMINI_API_KEY` vive en `.env` (server-side, nunca llega al navegador).

> Contrato real vigente (sustituye al borrador de abajo): el frontend manda el
> **Blob de vídeo**, no `frames: string[]`.


## 1. Objetivo
Recibir los frames de la actuación, enviarlos a Gemini Vision con el prompt de
Charades y devolver la(s) adivinanza(s) de película. Es el **componente de visión**
obligatorio del hackathon.

## 2. Alcance
- **Incluye:** endpoint backend `/api/guess`, construcción del prompt, llamada a
  Gemini multimodal, parseo de la respuesta a JSON estructurado.
- **NO incluye:** captura de frames (→ 02), matching/puntuación final (→ 04), UI (→ 01).

## 3. Interfaces / Contratos
### Expone
```ts
// POST /api/guess
type GuessRequest = { frames: string[] /* base64 */, target?: string };
type GuessResponse = { guesses: string[] /* hasta 3, mejor primero */, raw?: string };
```
### Consume
- De **02:** `frames` (formato a acordar).

## 4. Diseño técnico
API route de Next.js → SDK de Gemini. Prompt: "estás jugando a Charades; estas
imágenes son la actuación en secuencia; adivina el título de la película". Pedir
**top-3** en una sola llamada (o iterativo, ver pregunta abierta). Respuesta forzada
a JSON. `GEMINI_API_KEY` por variable de entorno (no commitear claves).

## 5. Dependencias
- Formato de `frames` con **02**.
- El matching con el `target` lo hace **04** (este componente solo propone guesses).

## 6. Criterios de aceptación
- [ ] `/api/guess` devuelve hasta 3 candidatos en JSON.
- [ ] Latencia objetivo < 3–4 s con el payload de 02.
- [ ] Clave de API fuera del repo (.env).

## 7. Riesgos / preguntas abiertas
- ¿Top-3 en una llamada o intentos iterativos?
- Calidad de adivinanza con mímica abstracta.
