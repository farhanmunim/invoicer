/* The Design dialog: layout choice + accent colour, applied live to the sheet. */
import { ACCENTS } from "./config.js";
import { $, $$, on } from "./dom.js";
import { updatePageGuides } from "./layout.js";
import { getState, saveState } from "./store.js";

const dialog = $("#design");
const swatchesEl = $("#swatches");
const sheetEl = $("#editor");

export function applyDesign() {
  const state = getState();
  sheetEl.dataset.design = state.design;
  document.documentElement.style.setProperty("--doc-accent", state.accent);
  $$('input[name="design"]').forEach((r) => { r.checked = r.value === state.design; });
  $$('input[name="accent"]').forEach((r) => { r.checked = r.value === state.accent; });
  updatePageGuides();
}

function setDesign(patch) {
  Object.assign(getState(), patch);
  saveState();
  applyDesign();
}

function buildSwatches() {
  ACCENTS.forEach((a) => {
    const label = document.createElement("label");
    label.className = "swatch";
    label.innerHTML = '<input class="swatch__input sr-only" type="radio" name="accent" /><span class="swatch__dot"></span><span class="sr-only"></span>';
    const input = label.querySelector("input");
    input.value = a.hex;
    label.querySelector(".sr-only:last-child").textContent = a.label;
    label.querySelector(".swatch__dot").style.setProperty("--swatch", a.hex);
    on(input, "change", () => setDesign({ accent: a.hex }));
    swatchesEl.appendChild(label);
  });
}

function openDialog() {
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  const checked = $('input[name="design"]:checked', dialog);
  if (checked) checked.focus();
}

function closeDialog() {
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
  $("#open-design").focus({ preventScroll: true });
}

export function initDesign() {
  buildSwatches();
  on($("#open-design"), "click", openDialog);
  on($("#design-close"), "click", closeDialog);
  on(dialog, "click", (e) => { if (e.target === dialog) closeDialog(); });
  $$('input[name="design"]').forEach((r) => on(r, "change", () => setDesign({ design: r.value })));
  applyDesign();
}
