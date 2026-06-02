# Spec — Integración IA / Gemini (reconocimiento por vídeo, multi-turno)

> **Owner:** Alex · **Rama:** `feat/gemini-integration` · **Estado:** En revisión

## 1. Objetivo
Recibir el **clip de vídeo** de la actuación del jugador, enviarlo a **Gemini** (modelo
multimodal con comprensión de vídeo) y devolver una **respuesta corta**: qué cree la IA que
se está mostrando ("creo que es un *X*"). Es el **componente de visión** obligatorio del
hackathon. A diferencia del draft anterior (frames + una sola adivinanza), ahora el flujo es
**conversacional / multi-turno**: la IA puede **pedir una aclaración** o **pedir un vídeo
nuevo**, y **un vídeo nuevo del mismo objeto continúa la misma conversación**.

## 2. Alcance
- **Incluye:** endpoint `POST /api/recognize`, subida del vídeo a la **Files API** de Gemini,
  llamada a la **Chat API multimodal** de Gemini (`ai.chats`) manteniendo el estado de la
  conversación con el **historial de chat persistido por sesión**, prompt configurable, y
  salida JSON estructurada (`responseJsonSchema`).
- **NO incluye:** captura/grabación del vídeo (→ 02), matching/puntuación (→ 04), UI del
  juego (→ 01). La página `/recognize` que incluyo es solo un **banco de pruebas** del
  componente, no la UI final.

## 3. Interfaces / Contratos
> **Cambio de contrato:** este endpoint **sustituye** al antiguo `POST /api/guess`
> `{ frames }`. Avisar a 01 (consume el resultado) y 04 (hace el matching del `label`).

### Expone
```ts
// POST /api/recognize  —  Content-Type: multipart/form-data
//   video      File     // clip de la actuación (obligatorio en el 1er turno;
//                       //   opcional si solo se responde por texto)
//   sessionId  string?  // omitir para empezar; reenviar para CONTINUAR la conversación
//   text       string?  // respuesta del usuario a una aclaración (con o sin vídeo nuevo)
//   domain     string?  // 'object' (por defecto) | 'movie' (modo charadas/película)

type RecognizeStatus = 'guess' | 'need_clarification' | 'ask_for_new_video';

type RecognizeResponse = {
  sessionId: string;            // generado en el 1er turno; reenviarlo para continuar
  turn: number;                 // contador de turnos (1-based)
  status: RecognizeStatus;
  label?: string;               // mejor candidato cuando status === 'guess'
  confidence?: number;          // 0..1
  message: string;              // respuesta corta para el usuario
  clarifyingQuestion?: string;  // presente cuando status === 'need_clarification'
};
```

### Consume
- De **02:** el **clip de vídeo** (`Blob` WebM de `MediaRecorder`, p. ej. `video/webm`).
  Resuelve la pregunta abierta 02↔03 a favor de **vídeo (clip)**, no frames sueltos.

## 4. Diseño técnico
- **Núcleo agnóstico al transporte** en `lib/` (reutilizable por el equipo):
  `gemini.ts` (cliente `GoogleGenAI`), `prompt.ts` (system-instructions + JSON schema),
  `store.ts` (`Map<sessionId, { lastInteractionId, turn, domain }>`), `recognizer.ts`,
  `types.ts`.
- **Flujo de un turno:**
  1. Subir el vídeo con `ai.files.upload(...)` y esperar (`ai.files.get`) a que
     `state === 'ACTIVE'`.
  2. `const chat = ai.chats.create({ model, history, config: { systemInstruction,
     responseMimeType:'application/json', responseJsonSchema } })`.
  3. `chat.sendMessage({ message: [ createPartFromUri(file.uri, file.mimeType), { text } ] })`.
  4. Parsear `response.text` (JSON) → `RecognizeResponse` (con parseo defensivo de respaldo).
  5. Guardar `chat.getHistory()` como historial de continuación de esa `sessionId`.
- **Multi-turno:** el estado se mantiene reconstruyendo el chat con el **historial persistido**
  de la sesión; un vídeo nuevo con el mismo `sessionId` continúa la conversación (el historial
  incluye las referencias a los vídeos anteriores, válidas ~48 h en la Files API).
- **Prompt configurable:** `domain='object'` (por defecto) identifica el objeto mostrado;
  `domain='movie'` adivina la película (modo charadas). Mismo motor, distinta system-instruction.
- **Modelo:** `gemini-2.5-flash` por defecto, configurable con `GEMINI_MODEL`.
- `GEMINI_API_KEY` (fallback `GOOGLE_API_KEY`) por variable de entorno; **nunca commitear claves**
  (`.gitignore` ya ignora `.env`; se incluye `.env.example`).

## 5. Dependencias
- **Externas:** `@google/genai` (v2.x; Chat API multimodal + Files API). `GEMINI_API_KEY`.
- **De 02:** formato del clip (WebM). El matching del `label` con el objetivo lo hace **04**.

## 6. Criterios de aceptación
- [ ] `POST /api/recognize` acepta un vídeo y devuelve `RecognizeResponse` en JSON.
- [ ] Multi-turno: reenviar `sessionId` con un vídeo nuevo **continúa** la conversación
      (la IA recuerda el turno anterior).
- [ ] La IA puede responder `guess`, `need_clarification` o `ask_for_new_video`.
- [ ] Clave de API fuera del repo (`.env`).
- [ ] El banco de pruebas en `/recognize` permite grabar, ver la respuesta y "grabar otra vez
      (mismo objeto)".

## 7. Riesgos / preguntas abiertas
- Latencia de subida + procesado del vídeo (Files API) frente al objetivo de ritmo del juego;
  para clips muy cortos se podría usar vídeo *inline* como optimización.
- El store en memoria no persiste entre reinicios ni entre workers serverless (suficiente para
  la demo; se puede cambiar por SQLite/Redis).
- Calidad del reconocimiento con mímica abstracta (modo `movie`).
