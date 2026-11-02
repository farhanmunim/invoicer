/* Coercion helpers: anything from storage or user input is untrusted until passed through these. */

export const toStr = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));

export const toNum = (v, min = -Infinity, max = Infinity) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0;
};
