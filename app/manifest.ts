import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Anexa Club",
    short_name: "Anexa",
    description: "Приватна бізнес-спільнота для підприємців, фрілансерів, експертів, стартапів і творців.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#07080D",
    theme_color: "#07080D",
    lang: "uk",
    icons: [
      {
        src: "/anexa-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
