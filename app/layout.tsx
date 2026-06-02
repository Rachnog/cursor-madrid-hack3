import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Charades 🎭",
  description: "Charades cooperativo con IA — captura de cámara",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
