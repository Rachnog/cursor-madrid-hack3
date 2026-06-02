# 🎭 AI Charades — Hackathon Cursor Madrid

Juego web de **Charades (mímica) cooperativo con IA**: el jugador actúa una película
delante de la webcam y la IA, con un modelo de **visión (Gemini API)**, intenta
adivinarla cuanto antes. El equipo (humano + IA) suma puntos y compite en un
**scoreboard**.

> 📄 La especificación de producto vive en **[`docs/PRD.md`](docs/PRD.md)**.

---

## 👥 Equipo

| Persona   | Componente (owner)                              | Spec |
| --------- | ----------------------------------------------- | ---- |
| Mauricio  | Frontend & flujo de juego                       | [`docs/specs/01-frontend-game-flow.md`](docs/specs/01-frontend-game-flow.md) |
| Miguel    | Captura de cámara & procesamiento de frames     | [`docs/specs/02-camera-capture.md`](docs/specs/02-camera-capture.md) |
| Alex      | Integración IA / Gemini (backend de adivinanza) | [`docs/specs/03-ai-gemini-integration.md`](docs/specs/03-ai-gemini-integration.md) |
| Jesús     | Puntuación, scoreboard & datos de películas      | [`docs/specs/04-scoring-scoreboard.md`](docs/specs/04-scoring-scoreboard.md) |

> El reparto es orientativo: ajustadlo entre vosotros, pero **cada componente tiene
> un único owner** responsable de su spec y su rama.

---

## 🧭 Modus operandi: Spec-Driven Development (SDD)

Trabajamos **spec-first**: nadie escribe código de producción hasta que existe una
spec clara de lo que va a construir. Esto nos permite paralelizar entre cuatro sin
pisarnos y tener interfaces claras entre componentes.

### El ciclo

```
1. SPEC GRANDE  →  2. SPECS POR COMPONENTE  →  3. RAMA  →  4. IMPLEMENTAR  →  5. PR + REVIEW  →  6. MERGE
   (docs/PRD.md)     (docs/specs/*.md, 1 x owner)   (1 x componente)                (a main)
```

1. **Spec grande (compartida).** El [`PRD`](docs/PRD.md) define el producto, el
   flujo de juego y la arquitectura. Es la fuente de verdad común. Cualquier cambio
   relevante de alcance se discute aquí primero.

2. **Spec por componente.** Cada owner escribe una spec **clara y detallada** de su
   parte en `docs/specs/`, partiendo de la
   [plantilla](docs/specs/TEMPLATE.md). Una buena spec define:
   - **Qué** hace el componente y **qué NO** (alcance).
   - **Interfaces / contratos** con los otros componentes (tipos, endpoints,
     payloads, eventos). Esto es lo más importante para no bloquearnos.
   - Decisiones técnicas, dependencias y criterios de aceptación.

3. **Rama por componente.** Cada owner trabaja en **su propia rama** (ver
   convención abajo). Nada se desarrolla directamente sobre `main`.

4. **Implementar contra la spec.** El código debe cumplir la spec. Si durante la
   implementación cambia algo del contrato, **se actualiza la spec primero** y se
   avisa a quien dependa de ella.

5. **Pull Request + review.** Al terminar (o al llegar a un hito), se abre un PR a
   `main`. Al menos otra persona del equipo lo revisa.

6. **Merge.** Tras aprobación, se mergea a `main`. Integrar pronto y a menudo.

### Reglas de oro

- 🔒 **`main` siempre verde:** debe poder ejecutarse / demostrarse en todo momento.
- 🧩 **Los contratos entre componentes se acuerdan en las specs**, no en el código.
  Si tu parte expone o consume una interfaz, escríbela en tu spec antes de codificar.
- ✍️ **Spec primero, código después.** Si vas a desviarte de la spec, actualízala.
- 🗣️ **Cambios de contrato = avisar al equipo.** Tocar un payload o un endpoint que
  otro consume requiere ping antes de mergear.

---

## 🌿 Convención de ramas

```
feat/<componente>        # nueva funcionalidad de un componente
fix/<descripcion>        # arreglo puntual
spec/<componente>        # cambios solo de spec (opcional)
```

Ejemplos:

```
feat/frontend-game-flow
feat/camera-capture
feat/gemini-integration
feat/scoring-scoreboard
```

Flujo git típico:

```bash
git checkout main && git pull
git checkout -b feat/mi-componente
# ...trabajar, commits pequeños y descriptivos...
git push -u origin feat/mi-componente
# abrir PR a main en GitHub
```

---

## 🏗️ Stack (propuesto)

- **Frontend + Backend:** Next.js + React + TypeScript (full-stack en un repo).
- **Visión / IA:** Gemini API (multimodal).
- **Scoreboard:** almacenamiento ligero (fichero / SQLite / Supabase).

> Detalle y justificación en el [PRD](docs/PRD.md).

---

## 🚀 Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar la clave de Gemini (no se commitea: .env está en .gitignore)
cp .env.example .env
#   …y rellena GEMINI_API_KEY en .env  (https://aistudio.google.com/apikey)

# 3. Arrancar en local
npm run dev
```

- **App del juego** (captura de cámara): http://localhost:3000 — ábrela en Chrome y da permiso de
  cámara. Flujo actual: cuenta atrás 5s → graba 10s → el clip se envía a `/api/guess` (Gemini procesa
  el vídeo) → la IA devuelve sus 3 mejores apuestas de película.
- **Banco de pruebas de IA** (reconocedor de vídeo multi-turno): http://localhost:3000/recognize

> **Prueba headless del multi-turno** (con el server arrancado): graba/consigue un clip y lanza
> `node scripts/smoke.mjs ruta/al/clip.webm` — hace 2 turnos en la misma sesión para verificar que
> la conversación continúa.

---

## 📁 Estructura del repo

```
.
├── README.md              # este archivo (modus operandi del equipo)
├── docs/
│   ├── PRD.md             # spec grande / producto
│   └── specs/             # specs por componente (1 owner cada una)
│       ├── TEMPLATE.md
│       ├── 01-frontend-game-flow.md
│       ├── 02-camera-capture.md
│       ├── 03-ai-gemini-integration.md
│       └── 04-scoring-scoreboard.md
└── ...                    # código de la app (por definir en el scaffold)
```
