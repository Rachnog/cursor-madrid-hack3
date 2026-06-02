# Spec — Captura de cámara & procesamiento de frames

> **Owner:** Miguel · **Rama:** `feat/camera-capture` · **Estado:** Draft

## 1. Objetivo
Acceder a la webcam, capturar la actuación de 10 s y producir el material visual
(frames muestreados o clip) listo para enviar a Gemini.

## 2. Alcance
- **Incluye:** permisos `getUserMedia`, preview de vídeo, muestreo de frames durante
  los 10 s, codificación (base64/blob) y entrega del payload.
- **NO incluye:** UI del juego (→ 01), llamada a Gemini (→ 03).

## 3. Interfaces / Contratos
### Expone
```ts
// Hook/servicio de captura
function useCapture(): {
  startCapture(): void;           // arranca el muestreo (al iniciar los 10 s)
  stopCapture(): Promise<Frames>; // devuelve los frames al acabar
};
type Frames = { images: string[] /* base64 */, fps: number, durationMs: number };
```
### Consume
- De **01:** señal de inicio/fin de la fase `acting`.

## 4. Diseño técnico
`getUserMedia` → `<video>` → muestreo vía `canvas.drawImage` cada ~0.5–1 s
(~10–20 frames). Redimensionar para reducir tamaño/latencia.

## 5. Dependencias
- Acordar con **03** el formato exacto de `Frames` (nº de imágenes, resolución).

## 6. Criterios de aceptación
- [ ] Permiso de cámara y preview funcionando en Chrome.
- [ ] `stopCapture()` devuelve N frames del intervalo de 10 s.
- [ ] Tamaño del payload optimizado para latencia < 3–4 s en 03.

## 7. Riesgos / preguntas abiertas
- ¿Frames muestreados o clip de vídeo? (impacta a 03)
- Compatibilidad de navegadores e iluminación.
