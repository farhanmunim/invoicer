/* Dates are handled in local time as YYYY-MM-DD strings, never UTC-shifted. */

function toISODate(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseISODate(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function today() {
  return toISODate(new Date());
}

export function addDays(iso, days) {
  const d = parseISODate(iso) || new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}
