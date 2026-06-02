import type { Metadata } from "next";
import AiActingStage from "@/app/components/AiActingStage";

export const metadata: Metadata = {
  title: "Turno de la IA · AI Charades",
  description:
    "Banco de pruebas del turno invertido: la IA muestra un vídeo (pre-generado o generado con Veo) y tú adivinas qué representa.",
};

export default function AiTurnPage() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "48px 20px",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>🎭 Turno de la IA</h1>
      <p style={{ color: "var(--muted)", marginBottom: 32 }}>
        Ahora actúa la IA: muestra un vídeo y tú adivinas qué representa (≤3 intentos). Por defecto
        usa un clip pre-generado; activa «Generar vídeo nuevo» para crearlo en vivo con Veo.
      </p>
      <AiActingStage />
    </main>
  );
}
