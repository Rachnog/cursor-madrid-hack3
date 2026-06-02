import { GoogleGenAI, Type } from "@google/genai";
import { MOVIES } from "../../data/movies";

// Procesado de vídeo con Gemini → se ejecuta en el servidor (la API key no llega al navegador).
export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// La carta robada se elige SIEMPRE de este catálogo cerrado, así que se lo damos a
// Gemini: solo tiene que reconocer cuál de estas películas se está mimando, no
// adivinar a ciegas entre todo el cine mundial.
//
// Además incluimos para CADA película los mismos gestos que se le sugieren al
// jugador como pistas. Damos las pistas de TODAS las películas (no solo la
// correcta), así que esto no filtra la respuesta: es un "diccionario de gestos"
// que ayuda a Gemini a mapear lo que ve a un título, pero sigue teniendo que
// reconocer qué gestos hizo realmente el jugador.
const MOVIE_LIST = MOVIES.map(
  (m) => `- ${m.title} → gestos típicos: ${m.hints.join("; ")}`
).join("\n");

const PROMPT = `Estás jugando a Charades (mímica) y formas parte del equipo del jugador.
En este vídeo, una persona actúa SIN HABLAR para representar el título de una PELÍCULA.
Observa con atención sus gestos, objetos, acciones y el número de palabras que marca con los dedos.

La película es OBLIGATORIAMENTE una de esta lista. Para cada título tienes los gestos
típicos que un jugador usaría para representarla; úsalos para emparejar lo que observas
en el vídeo con el título más probable (no propongas ningún título que no esté aquí):
${MOVIE_LIST}

Devuelve tus 3 mejores candidatos DE ESA LISTA, copiando el título EXACTAMENTE como aparece,
ordenados del MÁS probable al menos probable. Si no estás seguro, propón igualmente
tus 3 mejores apuestas de la lista.`;

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Falta GEMINI_API_KEY en el entorno (.env)." },
      { status: 500 }
    );
  }

  let videoBlob: Blob | null = null;
  try {
    const form = await req.formData();
    const file = form.get("video");
    if (file instanceof Blob) videoBlob = file;
  } catch {
    return Response.json({ error: "Body inválido (se esperaba FormData)." }, { status: 400 });
  }

  if (!videoBlob || videoBlob.size === 0) {
    return Response.json({ error: "No se recibió ningún vídeo." }, { status: 400 });
  }

  const base64 = Buffer.from(await videoBlob.arrayBuffer()).toString("base64");
  const mimeType = videoBlob.type || "video/webm";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        { inlineData: { mimeType, data: base64 } },
        { text: PROMPT },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            guesses: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 títulos de película, del más probable al menos probable",
            },
            reasoning: {
              type: Type.STRING,
              description: "Breve explicación (1-2 frases) de las pistas observadas",
            },
          },
          required: ["guesses"],
        },
      },
    });

    const text = response.text ?? "{}";
    const data = JSON.parse(text) as { guesses?: string[]; reasoning?: string };
    return Response.json({
      guesses: Array.isArray(data.guesses) ? data.guesses.slice(0, 3) : [],
      reasoning: data.reasoning ?? "",
      model: MODEL,
    });
  } catch (err) {
    console.error("Error llamando a Gemini:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: `Error procesando el vídeo con Gemini: ${detail}` },
      { status: 502 }
    );
  }
}
