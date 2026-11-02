/* Renders everything that is derived from the line items: totals, per-row amounts, due-date label. */
import { computeTotals, lineAmount } from "./calc.js";
import { $, $$ } from "./dom.js";
import { formatDate, formatMoney } from "./format.js";
import { schedulePageGuides } from "./layout.js";
import { getState, saveState } from "./store.js";

const itemsEl = $("#items");

export function renderTotals() {
  const state = getState();
  const totals = computeTotals(state);
  const text = {
    subtotal: formatMoney(totals.subtotal),
    discountAmount: Number(state.discount) > 0 ? `-${formatMoney(totals.discountAmount)}` : formatMoney(0),
    taxAmount: formatMoney(totals.taxAmount),
    total: formatMoney(totals.total),
    dueLabel: formatDate(state.dueDate) || "-",
  };
  $$("[data-out]").forEach((el) => { el.textContent = text[el.dataset.out]; });
  $$(".item", itemsEl).forEach((node, i) => {
    const out = node.querySelector('[data-field="amount"]');
    const next = formatMoney(lineAmount(state.items[i]));
    if (out.value !== next) out.value = next;
  });
  schedulePageGuides();
}

export function persistAndRender() {
  saveState();
  renderTotals();
}
