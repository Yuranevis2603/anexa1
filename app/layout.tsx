import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anexa Club — Приватна бізнес-спільнота",
  description: "Приватна бізнес-спільнота нового рівня.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" className="dark">
      <body className="antialiased bg-base text-ink-primary">{children}</body>
    </html>
  );
}
