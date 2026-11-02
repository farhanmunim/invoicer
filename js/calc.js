/* Invoice arithmetic. Rounds at every boundary so totals never drift (floating point). */
import { toNum } from "./coerce.js";

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function lineAmount(item) {
  return round2((Number(item.quantity) || 0) * (Number(item.rate) || 0));
}

export function computeTotals(state) {
  const subtotal = state.items.reduce((sum, it) => sum + lineAmount(it), 0);
  const discountAmount = round2(subtotal * (toNum(state.discount, 0, 100) / 100));
  const afterDiscount = round2(subtotal - discountAmount);
  const taxAmount = round2(afterDiscount * (toNum(state.tax, 0, 100) / 100));
  const total = round2(afterDiscount + taxAmount);
  return { subtotal: round2(subtotal), discountAmount, taxAmount, total };
}
