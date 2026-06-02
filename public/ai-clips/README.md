# Clips pre-generados del turno de la IA

Los `.mp4` de este directorio son las "mímicas" pre-generadas que la IA muestra en su turno
(roles invertidos, ver `docs/specs/05-ai-acting-video.md`). Se sirven estáticamente desde `/ai-clips/<id>.mp4`.

**Nombres opacos a propósito** (`p01.mp4`, `p02.mp4`, …): el nombre no debe revelar la respuesta.
La correspondencia clip → escena → respuesta vive en `lib/video/prompts.data.json` (solo servidor).

## Generarlos

```bash
node --env-file=.env scripts/pregenerate-clips.mjs          # genera los que falten
node --env-file=.env scripts/pregenerate-clips.mjs --force  # regenera todos
```

Necesita `GEMINI_API_KEY`. Veo es **lento y de pago** — ejecútalo una vez y **commitea** los `.mp4`
junto con `prompts.data.json` (que queda con el campo `clip` relleno). Mientras no haya clips, el
turno de la IA funciona con la opción «Generar vídeo nuevo».
