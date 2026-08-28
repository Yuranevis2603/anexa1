import type { Metadata, Viewport } from "next";
import "./globals.css";

const TITLE = "Anexa Club — Приватна бізнес-спільнота";
const DESCRIPTION = "Приватна бізнес-спільнота нового рівня.";

export const metadata: Metadata = {
  metadataBase: new URL("https://anexa.club"),
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: "/anexa-logo.png",
    apple: "/anexa-logo.png",
  },
  appleWebApp: {
    title: "Anexa Club",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://anexa.club",
    siteName: "Anexa Club",
    images: [{ url: "/anexa-logo.png", width: 511, height: 512 }],
    locale: "uk_UA",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/anexa-logo.png"],
  },
  verification: {
    google: "Ylo5kLKNbOJRVoU6odBiOQlLFu-vRKMmADeKPcuaW1c",
  },
};

export const viewport: Viewport = {
  themeColor: "#07080D",
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
