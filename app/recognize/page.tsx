import type { Metadata } from "next";
import RecognizerDemo from "@/app/components/RecognizerDemo";

export const metadata: Metadata = {
  title: "Reconocedor de vídeo · AI Charades",
  description: "Banco de pruebas del componente IA (Gemini): graba un vídeo y la IA adivina qué muestras.",
};

export default function RecognizePage() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "48px 20px",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>🎥 Reconocedor de vídeo</h1>
      <p style={{ color: "var(--muted)", marginBottom: 32 }}>
        Graba un clip mostrando un objeto y la IA intentará adivinar qué es. Puede pedirte una
        aclaración o un vídeo nuevo — y si grabas otra vez el mismo objeto, continúa la conversación.
      </p>
      <RecognizerDemo />
    </main>
  );
}
