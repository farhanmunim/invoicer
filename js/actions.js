/* Top-level user actions: Download PDF and New invoice (with Undo). */
import { DOWNLOAD_LOCK_MS, UNDO_TOAST_MS } from "./config.js";
import { computeTotals, lineAmount } from "./calc.js";
import { $, $$, isMobile, on } from "./dom.js";
import { formatDate, formatMoney, formatRate } from "./format.js";
import { nextNumber, defaultState } from "./model.js";
import { applyDesign } from "./design.js";
import { buildInvoicePdf } from "./pdf/index.js";
import { deliverPdf, safeFilename } from "./pdf-delivery.js";
import { renderAll } from "./render.js";
import { getState, loadSavedDetails, saveState, setState } from "./store.js";
import { showToast } from "./toast.js";

const downloadButtons = $$('[data-action="download"]');
let busy = false;

function setBusy(next) {
  busy = next;
  downloadButtons.forEach((btn) => {
    btn.disabled = next;
    btn.setAttribute("aria-busy", String(next));
  });
}

async function downloadPdf() {
  if (busy) return;
  if (!window.jspdf) {
    showToast("PDF engine didn't load. Check your connection and try again.");
    return;
  }
  setBusy(true);
  try {
    const state = getState();
    const doc = buildInvoicePdf({
      state,
      totals: computeTotals(state),
      money: formatMoney,
      rate: formatRate,
      date: formatDate,
      lineAmount,
    });
    await deliverPdf(doc.output("blob"), safeFilename(state.number));
  } catch (err) {
    console.error("PDF export failed", err);
    showToast("Couldn't create the PDF. Please try again.");
  } finally {
    // Hold the lock briefly so a double-click can't produce two downloads
    await new Promise((resolve) => setTimeout(resolve, DOWNLOAD_LOCK_MS));
    setBusy(false);
  }
}

function newInvoice() {
  const previous = getState();
  const fresh = { ...defaultState(), design: previous.design, accent: previous.accent, number: nextNumber(previous.number) };
  const saved = previous.remember ? loadSavedDetails() : null;
  if (saved) {
    fresh.from = { ...fresh.from, ...saved.from };
    fresh.notes = saved.notes || "";
    fresh.remember = true;
  }
  setState(fresh);
  saveState();
  renderAll();
  applyDesign();
  const first = $("#from-name");
  if (first && !isMobile()) first.focus({ preventScroll: true });
  showToast("Started a new invoice.", {
    actionLabel: "Undo",
    duration: UNDO_TOAST_MS,
    onAction() {
      setState(previous);
      saveState();
      renderAll();
      applyDesign();
    },
  });
}

export function initActions() {
  downloadButtons.forEach((b) => on(b, "click", downloadPdf));
  $$('[data-action="new"]').forEach((b) => on(b, "click", newInvoice));
}
