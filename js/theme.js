/* Light / dark theme: follows the OS until the user chooses, then remembers the choice. */
import { THEME_COLOR, THEME_KEY } from "./config.js";
import { $, on } from "./dom.js";
import { storageGet, storageSet } from "./storage.js";

const toggleButton = $("#theme-toggle");
const themeColorMeta = $('meta[name="theme-color"]');

const currentTheme = () => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");

function applyTheme(theme, persist = true) {
  const next = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  if (themeColorMeta) themeColorMeta.setAttribute("content", THEME_COLOR[next]);
  if (toggleButton) {
    toggleButton.setAttribute("aria-label", next === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }
  if (persist) storageSet(THEME_KEY, next);
}

export function initTheme() {
  applyTheme(currentTheme(), false);
  on(toggleButton, "click", () => applyTheme(currentTheme() === "dark" ? "light" : "dark"));
  // Follow the OS while the user hasn't chosen explicitly
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  on(media, "change", (e) => {
    if (!storageGet(THEME_KEY)) applyTheme(e.matches ? "dark" : "light", false);
  });
}
