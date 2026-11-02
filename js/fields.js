/* Two-way binding between the form fields ([data-bind="path.to.value"]) and the invoice state. */
import { MAX_RATE_DECIMALS } from "./config.js";
import { toNum } from "./coerce.js";
import { $, $$, on } from "./dom.js";
import { autosize } from "./layout.js";
import { clearSavedDetails, getState, isRememberedPath, saveState, writeSavedDetails } from "./store.js";
import { persistAndRender } from "./totals-view.js";

function setByPath(obj, path, value) {
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
  cur[keys[keys.length - 1]] = value;
}

function getByPath(obj, path) {
  return path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

// Zero shows as an empty field (placeholder visible) so users never have to delete a "0"
export function fieldValue(value) {
  return value === 0 ? "" : value;
}

// Clamp a number field to its min/max (and 4 dp for rates) once the user leaves it,
// so what the field shows is exactly what the invoice uses.
export function normalizeNumberField(el, commit) {
  if (el.type !== "number") return;
  const min = el.min === "" ? -Infinity : Number(el.min);
  const max = el.max === "" ? Infinity : Number(el.max);
  const factor = 10 ** MAX_RATE_DECIMALS;
  const value = Math.round(toNum(el.value, min, max) * factor) / factor;
  commit(value);
  el.value = fieldValue(value);
  persistAndRender();
}

export function bindAllValues() {
  const state = getState();
  $$("[data-bind]").forEach((el) => {
    const val = getByPath(state, el.dataset.bind);
    if (val != null) el.value = fieldValue(val);
  });
  $("#currency").value = state.currency;
  $("#remember").checked = !!state.remember;
}

export function bindFields() {
  // Enter inside a text field must never reload the page
  on($("#editor"), "submit", (e) => e.preventDefault());

  $$("[data-bind]").forEach((el) => {
    const path = el.dataset.bind;
    el.addEventListener("input", () => {
      const state = getState();
      const isNumber = el.type === "number";
      setByPath(state, path, isNumber ? Number(el.value) : el.value);
      if (state.remember && isRememberedPath(path)) writeSavedDetails();
      if (el.tagName === "TEXTAREA") autosize(el);
      persistAndRender();
    });
    el.addEventListener("change", () => normalizeNumberField(el, (v) => setByPath(getState(), path, v)));
    if (el.dataset.singleLine !== undefined) {
      el.addEventListener("keydown", (e) => { if (e.key === "Enter") e.preventDefault(); });
      el.addEventListener("input", () => {
        if (!el.value.includes("\n")) return;
        el.value = el.value.replace(/\s*\n\s*/g, " ");
        setByPath(getState(), path, el.value);
        autosize(el);
        persistAndRender();
      });
    }
  });
  bindAllValues();

  const rememberEl = $("#remember");
  rememberEl.addEventListener("change", () => {
    const state = getState();
    state.remember = rememberEl.checked;
    if (state.remember) writeSavedDetails();
    else clearSavedDetails();
    saveState();
  });

  $("#currency").addEventListener("change", (e) => {
    getState().currency = e.target.value;
    persistAndRender();
  });
}
