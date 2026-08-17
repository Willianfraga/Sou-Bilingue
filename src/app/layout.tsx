import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fluência Certificada",
  description:
    "App de aprendizado de idiomas com certificado mensal em vez de recompensa em dinheiro.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
