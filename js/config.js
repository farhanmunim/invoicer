/* App-wide constants. Anything tunable lives here so modules never hard-code magic values. */

export const STORAGE_KEY = "invoicer.current.v1";
export const SAVED_DETAILS_KEY = "invoicer.saved-details.v1";
export const THEME_KEY = "invoicer.theme";

export const CURRENCY_SYMBOLS = { GBP: "£", USD: "$" };
export const LOCALE_BY_CURRENCY = { GBP: "en-GB", USD: "en-US" };
export const CURRENCIES = Object.keys(LOCALE_BY_CURRENCY);

export const THEME_COLOR = { light: "#ffffff", dark: "#09090b" };

// Keep DESIGNS in step with the [data-design] rules in css/designs.css and js/pdf/designs.js.
export const DESIGNS = ["minimal", "modern", "bold", "centered"];
export const DEFAULT_DESIGN = "minimal";
export const ACCENTS = [
  { id: "ink", label: "Ink", hex: "#18181b" },
  { id: "blue", label: "Blue", hex: "#1d4ed8" },
  { id: "teal", label: "Teal", hex: "#0f766e" },
  { id: "green", label: "Green", hex: "#15803d" },
  { id: "red", label: "Red", hex: "#b91c1c" },
  { id: "violet", label: "Violet", hex: "#6d28d9" },
];
export const DEFAULT_ACCENT = ACCENTS[0].hex;

export const DEFAULT_DUE_DAYS = 14;
export const MAX_RATE_DECIMALS = 4;

// Media queries mirror the breakpoints in the CSS (they cannot read custom properties).
export const MOBILE_QUERY = "(max-width: 640px)";
export const SHEET_QUERY = "(min-width: 860px)";
export const A4_RATIO = 297 / 210;

export const TOAST_MS = 3500;
export const UNDO_TOAST_MS = 8000;
export const DOWNLOAD_LOCK_MS = 1000;
export const URL_REVOKE_MS = 10000;
