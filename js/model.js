/* The invoice data model: defaults, validation of untrusted data, and numbering. */
import { ACCENTS, CURRENCIES, DEFAULT_ACCENT, DEFAULT_DESIGN, DEFAULT_DUE_DAYS, DESIGNS } from "./config.js";
import { toNum, toStr } from "./coerce.js";
import { addDays, today } from "./dates.js";

function cryptoId() {
  return Math.random().toString(36).slice(2, 10);
}

export function newItem() {
  return { id: cryptoId(), description: "", quantity: 1, rate: 0 };
}

export const defaultState = () => ({
  number: "INV-0001",
  issueDate: today(),
  dueDate: addDays(today(), DEFAULT_DUE_DAYS),
  currency: "GBP",
  from: { name: "", details: "" },
  to: { name: "", details: "" },
  items: [newItem()],
  discount: 0,
  tax: 0,
  notes: "",
  remember: false,
  design: DEFAULT_DESIGN,
  accent: DEFAULT_ACCENT,
});

export const sanitizeParty = (p) => {
  const o = p && typeof p === "object" ? p : {};
  return { name: toStr(o.name), details: toStr(o.details) };
};

const sanitizeItem = (it) => ({
  id: toStr(it.id) || cryptoId(),
  description: toStr(it.description),
  quantity: it.quantity === undefined ? 1 : toNum(it.quantity, 0),
  rate: toNum(it.rate),
});

// Anything read from storage is untrusted: coerce it to the shape the app expects.
export function sanitizeState(raw) {
  const base = defaultState();
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const items = Array.isArray(o.items)
    ? o.items.filter((it) => it && typeof it === "object").map(sanitizeItem)
    : [];
  return {
    number: typeof o.number === "string" ? o.number : base.number,
    issueDate: typeof o.issueDate === "string" ? o.issueDate : base.issueDate,
    dueDate: typeof o.dueDate === "string" ? o.dueDate : base.dueDate,
    currency: CURRENCIES.includes(o.currency) ? o.currency : base.currency,
    from: sanitizeParty(o.from),
    to: sanitizeParty(o.to),
    items: items.length ? items : base.items,
    discount: toNum(o.discount, 0, 100),
    tax: toNum(o.tax, 0, 100),
    notes: toStr(o.notes),
    remember: o.remember === true,
    design: DESIGNS.includes(o.design) ? o.design : base.design,
    accent: ACCENTS.some((x) => x.hex === o.accent) ? o.accent : base.accent,
  };
}

// INV-0009 -> INV-0010, 2026/07 -> 2026/08; numbers without digits fall back to the default
export function nextNumber(current) {
  const m = /^(.*?)(\d+)(\D*)$/.exec(String(current || ""));
  if (!m) return defaultState().number;
  return `${m[1]}${(BigInt(m[2]) + 1n).toString().padStart(m[2].length, "0")}${m[3]}`;
}
