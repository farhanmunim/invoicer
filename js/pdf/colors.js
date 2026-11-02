/* Colour helpers: PDF drawing wants [r, g, b] arrays. */
import { DEFAULT_ACCENT } from "../config.js";

const HEX = /^#([0-9a-f]{6})$/i;

export function hexToRgb(hex) {
  const m = HEX.exec(hex || "") || HEX.exec(DEFAULT_ACCENT);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Mixes a colour with white (amount 1 = the colour itself, 0 = white).
export const tint = (rgb, amount) => rgb.map((c) => Math.round(255 - (255 - c) * amount));
