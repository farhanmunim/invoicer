/* Sheet layout helpers: auto-growing textareas and the A4 page-break guides. */
import { A4_RATIO, SHEET_QUERY } from "./config.js";
import { $, $$ } from "./dom.js";

const sheetEl = $("#editor");

export function autosize(el) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function autosizeAll() {
  $$("textarea.field__input--area").forEach(autosize);
}

// Sizes the sheet to a whole number of A4 pages so the guides line up (tablet/desktop only).
export function updatePageGuides() {
  sheetEl.style.setProperty("--pages", 1);
  if (!window.matchMedia(SHEET_QUERY).matches) return;
  const pageHeight = sheetEl.offsetWidth * A4_RATIO;
  const pages = Math.max(1, Math.ceil((sheetEl.scrollHeight - 1) / pageHeight));
  sheetEl.style.setProperty("--pages", pages);
}

let guideFrame = 0;
export function schedulePageGuides() {
  if (guideFrame) return;
  guideFrame = requestAnimationFrame(() => {
    guideFrame = 0;
    updatePageGuides();
  });
}

export function layout() {
  autosizeAll();
  updatePageGuides();
}

export async function layoutAfterFonts() {
  if (!document.fonts || !document.fonts.ready) return;
  await document.fonts.ready;
  layout();
}
