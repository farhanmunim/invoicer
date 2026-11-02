/* A single transient message, optionally with one action button (e.g. Undo). */
import { TOAST_MS } from "./config.js";
import { $, on } from "./dom.js";

const toastEl = $("#toast");
const textEl = $("#toast-text");
const actionEl = $("#toast-action");
let timer = 0;
let onAction = null;

function hideToast() {
  clearTimeout(timer);
  toastEl.hidden = true;
  onAction = null;
}

export function showToast(message, { actionLabel = "", onAction: handler = null, duration = TOAST_MS } = {}) {
  textEl.textContent = message;
  actionEl.hidden = !actionLabel;
  actionEl.textContent = actionLabel;
  onAction = handler;
  toastEl.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(hideToast, duration);
}

export function initToast() {
  on(actionEl, "click", () => {
    const run = onAction;
    hideToast();
    if (run) run();
  });
}
