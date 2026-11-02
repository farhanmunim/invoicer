/* The single source of truth for the current invoice, plus its persistence in localStorage. */
import { SAVED_DETAILS_KEY, STORAGE_KEY } from "./config.js";
import { toStr } from "./coerce.js";
import { defaultState, sanitizeParty, sanitizeState } from "./model.js";
import { storageGet, storageRemove, storageSet } from "./storage.js";

function loadState() {
  try {
    const raw = storageGet(STORAGE_KEY);
    return raw ? sanitizeState(JSON.parse(raw)) : defaultState();
  } catch {
    return defaultState();
  }
}

let state = loadState();

export const getState = () => state;

export function setState(next) {
  state = next;
}

export function saveState() {
  storageSet(STORAGE_KEY, JSON.stringify(state));
}

/* ---------- "Remember my details & notes" ---------- */
export function isRememberedPath(path) {
  return path === "from.name" || path === "from.details" || path === "notes";
}

export function loadSavedDetails() {
  try {
    const raw = storageGet(SAVED_DETAILS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { from: sanitizeParty(parsed && parsed.from), notes: toStr(parsed && parsed.notes) };
  } catch {
    return null;
  }
}

export function writeSavedDetails() {
  storageSet(SAVED_DETAILS_KEY, JSON.stringify({
    from: { ...state.from },
    notes: state.notes,
  }));
}

export function clearSavedDetails() {
  storageRemove(SAVED_DETAILS_KEY);
}

// First-time hydration: if the current invoice is blank and we have saved details, prefill.
export function hydrateRememberedDetails() {
  const saved = loadSavedDetails();
  if (!saved) return;
  const isBlank = !state.from.name && !state.from.details && !state.notes;
  if (!isBlank) return;
  state.from = { ...state.from, ...saved.from };
  state.notes = saved.notes || "";
  state.remember = true;
  saveState();
}
