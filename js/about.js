/* The About / Privacy dialog. */
import { $, on } from "./dom.js";

const dialog = $("#about");

function open(focusTarget) {
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  if (focusTarget) {
    focusTarget.focus();
    focusTarget.scrollIntoView({ block: "start" });
  }
}

function close() {
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

export function initAbout() {
  if (!dialog) return;
  on($("#open-about"), "click", () => open());
  on($("#open-privacy"), "click", () => open($("#about-privacy")));
  on($("#about-close"), "click", () => close());
  on(dialog, "click", (e) => {
    if (e.target === dialog) close();
  });
}
