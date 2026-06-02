# Spec — Integración IA / Gemini (backend de adivinanza)

> **Owner:** Alex · **Rama:** `feat/gemini-integration` · **Estado:** Draft

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
