/**
 * Brand tokens mirrored from tailwind.config.ts. Plain TS constants (not
 * Tailwind classes) since email clients strip <style>/class-based CSS
 * unreliably -- every email component uses these directly as inline
 * style values and, where it matters for Outlook, as literal HTML
 * attributes (bgcolor, width) too.
 */
export const colors = {
  base: "#09090B",
  baseCard: "#111217",
  baseSurface: "#0D0D10",
  inkPrimary: "#F5F5F7",
  inkSecondary: "#9B9BA3",
  inkTertiary: "#5C5C64",
  borderSubtle: "rgba(255,255,255,0.06)",
  borderStrong: "rgba(255,255,255,0.16)",
  purple: "#7C5CFF",
  purpleSoft: "#9A82FF",
  blue: "#4E8CFF",
  blueSoft: "#7CACFF",
  gold: "#E8B85C",
  success: "#3ECF8E",
  danger: "#EF4444",
} as const;

export const gradient = "linear-gradient(135deg, #7C5CFF 0%, #4E8CFF 100%)";

export const fontFamily =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const siteUrl = "https://anexa.club";
export const logoUrl = `${siteUrl}/anexa-logo.png`;

export const tagline = "Простір, де амбітні люди будують майбутнє.";
export const copyrightLine = "© 2026 ANEXA. Усі права захищено.";
