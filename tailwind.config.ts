import type { Config } from "tailwindcss";

// Design tokens extracted from the existing Anexa Club/ANEXA static preview.
// Do not invent new colors elsewhere — extend this file instead so the
// whole app stays visually consistent.
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#09090B",
          card: "#111217",
          surface: "#0D0D10",
        },
        ink: {
          primary: "#F5F5F7",
          secondary: "#9B9BA3",
          tertiary: "#5C5C64",
        },
        border: {
          subtle: "rgba(255,255,255,0.06)",
          strong: "rgba(255,255,255,0.16)",
        },
        purple: {
          DEFAULT: "#7C5CFF",
          soft: "#9A82FF",
        },
        blue: {
          DEFAULT: "#4E8CFF",
          soft: "#7CACFF",
        },
        gold: {
          DEFAULT: "#E8B85C",
          soft: "#F2CE87",
        },
        success: "#3ECF8E",
        danger: "#EF4444",
      },
      backgroundImage: {
        "grad-purple-blue": "linear-gradient(135deg, #7C5CFF 0%, #4E8CFF 100%)",
      },
      boxShadow: {
        "glow-purple": "0 0 32px rgba(124,92,255,0.28)",
        "glow-blue": "0 0 32px rgba(78,140,255,0.24)",
        "glow-gold": "0 0 32px rgba(232,184,92,0.22)",
      },
      borderRadius: {
        lg: "18px",
        "2xl": "24px",
      },
      fontFamily: {
        display: ["var(--font-display)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
