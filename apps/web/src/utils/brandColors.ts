/**
 * Brand Color Palette Generator
 *
 * Given a single hex color (e.g. "#6366f1"), generates a full shade palette
 * (50 through 950) suitable for use as CSS custom properties.
 *
 * Key design decisions:
 *  - brand-500 IS the exact input color (no approximation)
 *  - brand-600 is only slightly darker — used for buttons, headers, etc.
 *  - Light shades (50–200) are the input color at low opacity over white,
 *    giving natural-looking tints without weird desaturation
 *  - CSS variables store RGB channels ("99 102 241") so Tailwind's
 *    opacity modifier syntax (`bg-brand-500/40`) works correctly
 */

// ── Conversions ──────────────────────────────────────────────────────────────

function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

function hexToRgb255(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.max(0, Math.min(1, color)))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Mix a color with white at a given ratio (0 = full white, 1 = full color).
 * This simulates `color` at `ratio` opacity on a white background.
 */
function mixWithWhite(r: number, g: number, b: number, ratio: number): [number, number, number] {
  return [
    Math.round(255 + (r - 255) * ratio),
    Math.round(255 + (g - 255) * ratio),
    Math.round(255 + (b - 255) * ratio),
  ];
}

function rgb255ToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0")
  );
}

// ── Palette generation ───────────────────────────────────────────────────────

export interface BrandPalette {
  [weight: number]: string; // hex color
}

/**
 * Generate a full palette from a single brand color hex.
 *
 * - brand-500 = the exact input color
 * - Lighter shades = input mixed with white (natural tints)
 * - Darker shades = input with reduced lightness in HSL
 */
export function generateBrandPalette(hex: string): BrandPalette {
  const [r01, g01, b01] = hexToRgb01(hex);
  const [hue, sat] = rgbToHsl(r01, g01, b01);
  const [r, g, b] = hexToRgb255(hex);

  const palette: BrandPalette = {};

  // Light shades: mix with white (simulates opacity over white bg)
  palette[50] = rgb255ToHex(...mixWithWhite(r, g, b, 0.05));
  palette[100] = rgb255ToHex(...mixWithWhite(r, g, b, 0.10));
  palette[200] = rgb255ToHex(...mixWithWhite(r, g, b, 0.20));
  palette[300] = rgb255ToHex(...mixWithWhite(r, g, b, 0.40));
  palette[400] = rgb255ToHex(...mixWithWhite(r, g, b, 0.70));

  // 500 = the exact input color
  palette[500] = hex;

  // Darker shades: reduce lightness in HSL space
  palette[600] = hslToHex(hue, Math.min(100, sat + 5), Math.max(10, lightness(hex) - 8));
  palette[700] = hslToHex(hue, Math.min(100, sat + 8), Math.max(10, lightness(hex) - 16));
  palette[800] = hslToHex(hue, Math.min(100, sat + 10), Math.max(8, lightness(hex) - 24));
  palette[900] = hslToHex(hue, Math.min(100, sat + 10), Math.max(6, lightness(hex) - 32));
  palette[950] = hslToHex(hue, Math.min(100, sat + 10), Math.max(5, lightness(hex) - 40));

  return palette;
}

/** Helper: get lightness of a hex color */
function lightness(hex: string): number {
  const [r, g, b] = hexToRgb01(hex);
  const [, , l] = rgbToHsl(r, g, b);
  return l;
}

/**
 * Build CSS custom property declarations using RGB channel values.
 */
export function brandCssVariables(hex: string): Record<string, string> {
  const palette = generateBrandPalette(hex);
  const vars: Record<string, string> = {};

  for (const [weight, color] of Object.entries(palette)) {
    const [cr, cg, cb] = hexToRgb255(color);
    vars[`--brand-${weight}`] = `${cr} ${cg} ${cb}`;
  }

  const [cr, cg, cb] = hexToRgb255(hex);
  vars["--brand"] = `${cr} ${cg} ${cb}`;

  return vars;
}

/** Default brand color (indigo / blurple). */
export const DEFAULT_BRAND_COLOR = "#6366f1";

/** localStorage key for cached brand color. */
const BRAND_COLOR_CACHE_KEY = "brandColor";

/** Persist brand color to localStorage for instant paint on next load. */
export function cacheBrandColor(hex: string) {
  try {
    localStorage.setItem(BRAND_COLOR_CACHE_KEY, hex);
  } catch {
    // storage blocked — not critical
  }
}

/** Read cached brand color from localStorage. */
export function getCachedBrandColor(): string | null {
  try {
    return localStorage.getItem(BRAND_COLOR_CACHE_KEY);
  } catch {
    return null;
  }
}

/** Apply brand CSS variables to the document root. */
export function applyBrandColors(hex: string) {
  if (typeof document === "undefined") return;

  const vars = brandCssVariables(hex);
  const root = document.documentElement;

  for (const [prop, value] of Object.entries(vars)) {
    root.style.setProperty(prop, value);
  }
}

/** Returns true if the color is dark (light text should be used on it). */
export function isDarkColor(hex: string): boolean {
  const [r, g, b] = hexToRgb01(hex);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance < 0.55;
}

/** Get a contrast-safe text color (white or dark) for a given background hex. */
export function getContrastText(hex: string): string {
  return isDarkColor(hex) ? "#ffffff" : "#1a1a1a";
}
