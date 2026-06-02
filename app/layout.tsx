import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moncloa Charades 🎭",
  description: "Mímica de Estado: roba tu papel, actúa y deja que la IA adivine la película.",
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
