import CameraCapture from "./components/CameraCapture";

export default function Home() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "48px 20px",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 36, marginBottom: 8 }}>🎭 AI Charades</h1>
      <p style={{ color: "var(--muted)", marginBottom: 32 }}>
        Cuenta atrás de 5s, graba 10s de mímica y descarga tu clip.
      </p>
      <CameraCapture />
    </main>
  );
}
