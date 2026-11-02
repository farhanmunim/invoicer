/* Locale-aware formatting of money, rates and dates for the current invoice currency. */
import { CURRENCY_SYMBOLS, LOCALE_BY_CURRENCY, MAX_RATE_DECIMALS } from "./config.js";
import { parseISODate } from "./dates.js";
import { getState } from "./store.js";

const localeFor = (currency) => LOCALE_BY_CURRENCY[currency] || "en-GB";

export function formatMoney(value) {
  const { currency } = getState();
  const n = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(localeFor(currency), {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${CURRENCY_SYMBOLS[currency] || ""}${n.toFixed(2)}`;
  }
}

// Rates keep the precision the user typed (up to 4 dp) so rate × qty is checkable on paper.
export function formatRate(value) {
  const { currency } = getState();
  const n = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(localeFor(currency), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: MAX_RATE_DECIMALS,
  }).format(n);
}

export function formatDate(iso) {
  const d = parseISODate(iso);
  if (!d) return "";
  return d.toLocaleDateString(localeFor(getState().currency), { year: "numeric", month: "short", day: "numeric" });
}
