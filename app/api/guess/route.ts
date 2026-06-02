import { GoogleGenAI, Type } from "@google/genai";

// Procesado de vídeo con Gemini → se ejecuta en el servidor (la API key no llega al navegador).
export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const PROMPT = `Estás jugando a Charades (mímica) y formas parte del equipo del jugador.
En este vídeo, una persona actúa SIN HABLAR para representar el título de una PELÍCULA.
Observa con atención sus gestos, objetos, acciones y el número de palabras que marca con los dedos.

Adivina qué película está intentando representar. Devuelve tus 3 mejores candidatos,
ordenados del MÁS probable al menos probable. Si no estás seguro, propón igualmente
tus mejores apuestas.`;

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
    return Response.json(
      { error: "Error procesando el vídeo con Gemini." },
      { status: 502 }
    );
  }
}
