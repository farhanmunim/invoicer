(() => {
  "use strict";

  const STORAGE_KEY = "invoicer.current.v1";
  const SAVED_DETAILS_KEY = "invoicer.saved-details.v1";
  const THEME_KEY = "invoicer.theme";
  const CURRENCY_SYMBOLS = { GBP: "£", USD: "$" };
  const LOCALE_BY_CURRENCY = { GBP: "en-GB", USD: "en-US" };
  const THEME_COLOR = { light: "#ffffff", dark: "#09090b" };
  const DEFAULT_DUE_DAYS = 14;
  const DESIGNS = ["minimal", "modern", "bold", "centered"];
  const DEFAULT_DESIGN = "minimal";
  const ACCENTS = [
    { id: "ink", label: "Ink", hex: "#18181b" },
    { id: "blue", label: "Blue", hex: "#1d4ed8" },
    { id: "teal", label: "Teal", hex: "#0f766e" },
    { id: "green", label: "Green", hex: "#15803d" },
    { id: "red", label: "Red", hex: "#b91c1c" },
    { id: "violet", label: "Violet", hex: "#6d28d9" },
  ];
  const DEFAULT_ACCENT = ACCENTS[0].hex;
  const MOBILE_QUERY = "(max-width: 640px)";
  const SHEET_QUERY = "(min-width: 860px)";
  const A4_RATIO = 297 / 210;
  const TOAST_MS = 3500;
  const URL_REVOKE_MS = 10000;

  /* ---------- tiny DOM helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
  const mobileMedia = window.matchMedia(MOBILE_QUERY);
  const isMobile = () => mobileMedia.matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)");

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch { /* storage unavailable — keep working in memory */ }
  }
  function storageRemove(key) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }

  /* ---------- Dates (local time, never UTC-shifted) ---------- */
  function toISODate(d) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function parseISODate(iso) {
    if (!iso) return null;
    const [y, m, d] = String(iso).split("-").map(Number);
    if (!y || !m || !d) return null;
    const date = new Date(y, m - 1, d);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  function today() { return toISODate(new Date()); }
  function addDays(iso, days) {
    const d = parseISODate(iso) || new Date();
    d.setDate(d.getDate() + days);
    return toISODate(d);
  }

  /* ---------- State ---------- */
  const defaultState = () => ({
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

  function newItem() {
    return { id: cryptoId(), description: "", quantity: 1, rate: 0 };
  }

  function cryptoId() {
    return Math.random().toString(36).slice(2, 10);
  }

  /* ---------- Persistence ---------- */
  function loadState() {
    try {
      const raw = storageGet(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const merged = { ...defaultState(), ...parsed };
      if (!Array.isArray(merged.items) || merged.items.length === 0) merged.items = [newItem()];
      if (!DESIGNS.includes(merged.design)) merged.design = DEFAULT_DESIGN;
      if (!ACCENTS.some((x) => x.hex === merged.accent)) merged.accent = DEFAULT_ACCENT;
      return merged;
    } catch {
      return defaultState();
    }
  }

  function saveState() {
    storageSet(STORAGE_KEY, JSON.stringify(state));
  }

  let state = loadState();

  function loadSavedDetails() {
    try {
      const raw = storageGet(SAVED_DETAILS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function writeSavedDetails() {
    storageSet(SAVED_DETAILS_KEY, JSON.stringify({
      from: { ...state.from },
      notes: state.notes,
    }));
  }

  function clearSavedDetails() {
    storageRemove(SAVED_DETAILS_KEY);
  }

  // First-time hydration: if current invoice is blank and we have saved details, prefill
  (() => {
    const saved = loadSavedDetails();
    if (!saved) return;
    const isBlank = !state.from.name && !state.from.details && !state.notes;
    if (isBlank) {
      state.from = { ...state.from, ...saved.from };
      state.notes = saved.notes || "";
      state.remember = true;
      saveState();
    }
  })();

  /* ---------- Theme ---------- */
  const Theme = {
    btn: $("#theme-toggle"),
    meta: $('meta[name="theme-color"]'),

    init() {
      Theme.apply(Theme.current(), false);
      on(Theme.btn, "click", Theme.toggle);
      // Follow the OS while the user hasn't chosen explicitly
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      on(media, "change", (e) => {
        if (!storageGet(THEME_KEY)) Theme.apply(e.matches ? "dark" : "light", false);
      });
    },

    current() {
      return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    },

    apply(theme, persist = true) {
      const next = theme === "dark" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      if (Theme.meta) Theme.meta.setAttribute("content", THEME_COLOR[next]);
      if (Theme.btn) {
        Theme.btn.setAttribute("aria-label", next === "dark" ? "Switch to light mode" : "Switch to dark mode");
      }
      if (persist) storageSet(THEME_KEY, next);
    },

    toggle() {
      Theme.apply(Theme.current() === "dark" ? "light" : "dark");
    },
  };

  /* ---------- Formatting ---------- */
  function formatMoney(value) {
    const locale = LOCALE_BY_CURRENCY[state.currency] || "en-GB";
    const n = Number.isFinite(value) ? value : 0;
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: state.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);
    } catch {
      return `${CURRENCY_SYMBOLS[state.currency] || ""}${n.toFixed(2)}`;
    }
  }

  function formatDate(iso) {
    const d = parseISODate(iso);
    if (!d) return "";
    const locale = LOCALE_BY_CURRENCY[state.currency] || "en-GB";
    return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  }

  /* ---------- Calculations (avoid FP drift by rounding at boundaries) ---------- */
  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

  function lineAmount(item) {
    return round2((Number(item.quantity) || 0) * (Number(item.rate) || 0));
  }

  function computeTotals() {
    const subtotal = state.items.reduce((sum, it) => sum + lineAmount(it), 0);
    const discountAmount = round2(subtotal * ((Number(state.discount) || 0) / 100));
    const afterDiscount = round2(subtotal - discountAmount);
    const taxAmount = round2(afterDiscount * ((Number(state.tax) || 0) / 100));
    const total = round2(afterDiscount + taxAmount);
    return { subtotal: round2(subtotal), discountAmount, taxAmount, total };
  }

  /* ---------- Editor bindings ---------- */
  function setByPath(obj, path, value) {
    const keys = path.split(".");
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
    cur[keys[keys.length - 1]] = value;
  }

  function getByPath(obj, path) {
    return path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
  }

  function isRememberedPath(path) {
    return path === "from.name" || path === "from.details" || path === "notes";
  }

  // Zero shows as an empty field (placeholder visible) so users never have to delete a "0"
  function fieldValue(value) {
    return value === 0 ? "" : value;
  }

  /* ---------- Auto-growing textareas + A4 page guides ---------- */
  const sheetEl = $("#editor");

  function autosize(el) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function autosizeAll() {
    $$("textarea.field__input--area").forEach(autosize);
  }

  function updatePageGuides() {
    sheetEl.style.setProperty("--pages", 1);
    if (!window.matchMedia(SHEET_QUERY).matches) return;
    const pageHeight = sheetEl.offsetWidth * A4_RATIO;
    const pages = Math.max(1, Math.ceil((sheetEl.scrollHeight - 1) / pageHeight));
    sheetEl.style.setProperty("--pages", pages);
  }

  function layout() {
    autosizeAll();
    updatePageGuides();
  }

  function bindFields() {
    // Enter inside a text field must never reload the page
    on(sheetEl, "submit", (e) => e.preventDefault());

    $$("[data-bind]").forEach((el) => {
      const path = el.dataset.bind;
      el.addEventListener("input", () => {
        const isNumber = el.type === "number";
        setByPath(state, path, isNumber ? Number(el.value) : el.value);
        if (state.remember && isRememberedPath(path)) writeSavedDetails();
        if (el.tagName === "TEXTAREA") autosize(el);
        persistAndRender();
      });
    });
    bindAllValues();

    const rememberEl = $("#remember");
    rememberEl.addEventListener("change", () => {
      state.remember = rememberEl.checked;
      if (state.remember) writeSavedDetails();
      else clearSavedDetails();
      saveState();
    });

    $("#currency").addEventListener("change", (e) => {
      state.currency = e.target.value;
      persistAndRender();
    });
  }

  /* ---------- Line items ---------- */
  const itemsEl = $("#items");
  const template = $("#item-template");

  function labelItem(node, index) {
    const n = index + 1;
    node.querySelector('[data-field="description"]').setAttribute("aria-label", `Item ${n} description`);
    node.querySelector('[data-field="quantity"]').setAttribute("aria-label", `Item ${n} quantity`);
    node.querySelector('[data-field="rate"]').setAttribute("aria-label", `Item ${n} rate`);
    node.querySelector('[data-field="amount"]').setAttribute("aria-label", `Item ${n} amount`);
    node.querySelector(".item__remove").setAttribute("aria-label", `Remove item ${n}`);
  }

  function focusItem(index) {
    const rows = $$(".item", itemsEl);
    const target = rows[Math.max(0, Math.min(index, rows.length - 1))];
    if (target) target.querySelector('[data-field="description"]').focus();
  }

  function renderItems() {
    itemsEl.textContent = "";
    state.items.forEach((item, index) => {
      const node = template.content.firstElementChild.cloneNode(true);
      node.dataset.id = item.id;
      node.querySelector('[data-field="description"]').value = item.description;
      node.querySelector('[data-field="quantity"]').value = fieldValue(item.quantity);
      node.querySelector('[data-field="rate"]').value = fieldValue(item.rate);
      labelItem(node, index);

      node.addEventListener("input", (e) => {
        const field = e.target.dataset.field;
        if (!field) return;
        item[field] = e.target.type === "number" ? Number(e.target.value) : e.target.value;
        if (e.target.tagName === "TEXTAREA") autosize(e.target);
        persistAndRender();
      });

      node.querySelector(".item__remove").addEventListener("click", () => {
        const idx = state.items.findIndex((i) => i.id === item.id);
        state.items = state.items.filter((i) => i.id !== item.id);
        if (state.items.length === 0) state.items.push(newItem());
        saveState();
        renderItems();
        renderTotals();
        focusItem(idx);
      });

      itemsEl.appendChild(node);
      autosize(node.querySelector('[data-field="description"]'));
    });
    renderTotals();
  }

  on($("#add-item"), "click", () => {
    state.items.push(newItem());
    saveState();
    renderItems();
    focusItem(state.items.length - 1);
  });

  /* ---------- Totals + amounts ---------- */
  function renderTotals() {
    const totals = computeTotals();
    const text = {
      subtotal: formatMoney(totals.subtotal),
      discountAmount: Number(state.discount) > 0 ? `-${formatMoney(totals.discountAmount)}` : formatMoney(0),
      taxAmount: formatMoney(totals.taxAmount),
      total: formatMoney(totals.total),
      dueLabel: formatDate(state.dueDate) || "-",
    };
    $$("[data-out]").forEach((el) => { el.textContent = text[el.dataset.out]; });
    $$(".item", itemsEl).forEach((node, i) => {
      node.querySelector('[data-field="amount"]').value = formatMoney(lineAmount(state.items[i]));
    });
    updatePageGuides();
  }

  function persistAndRender() {
    saveState();
    renderTotals();
  }

  /* ---------- Toast ---------- */
  const Toast = {
    el: $("#toast"),
    timer: 0,
    show(message) {
      Toast.el.textContent = message;
      Toast.el.hidden = false;
      clearTimeout(Toast.timer);
      Toast.timer = setTimeout(() => { Toast.el.hidden = true; }, TOAST_MS);
    },
  };

  /* ---------- PDF delivery ---------- */
  function safeFilename(name) {
    const base = String(name || "Invoice").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").trim() || "Invoice";
    return `${base}.pdf`;
  }

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), URL_REVOKE_MS);
  }

  // Touch devices: the native share sheet offers "Save to Files" / "Open in…" reliably.
  // Desktop and everything else: a normal download.
  async function deliverPdf(blob, filename) {
    const file = new File([blob], filename, { type: "application/pdf" });
    if (coarsePointer.matches && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }
    saveBlob(blob, filename);
  }

  /* ---------- Actions ---------- */
  const Actions = {
    downloadButtons: $$('[data-action="download"]'),
    busy: false,

    init() {
      $$('[data-action="download"]').forEach((b) => on(b, "click", Actions.downloadPdf));
      $$('[data-action="new"]').forEach((b) => on(b, "click", Actions.newInvoice));
    },

    setBusy(busy) {
      Actions.busy = busy;
      Actions.downloadButtons.forEach((btn) => {
        btn.disabled = busy;
        btn.setAttribute("aria-busy", String(busy));
      });
    },

    async downloadPdf() {
      if (Actions.busy) return;
      if (!window.jspdf || !window.InvoicePdf) {
        Toast.show("PDF engine didn't load. Check your connection and try again.");
        return;
      }
      Actions.setBusy(true);
      try {
        const doc = window.InvoicePdf.build({
          state,
          totals: computeTotals(),
          money: formatMoney,
          date: formatDate,
          lineAmount,
        });
        const blob = doc.output("blob");
        await deliverPdf(blob, safeFilename(state.number));
      } catch (err) {
        console.error("PDF export failed", err);
        Toast.show("Couldn't create the PDF. Please try again.");
      } finally {
        Actions.setBusy(false);
      }
    },

    newInvoice() {
      if (!confirm("Start a new invoice? Current data will be cleared.")) return;
      const fresh = { ...defaultState(), design: state.design, accent: state.accent };
      const saved = state.remember ? loadSavedDetails() : null;
      if (saved) {
        fresh.from = { ...fresh.from, ...saved.from };
        fresh.notes = saved.notes || "";
        fresh.remember = true;
      }
      state = fresh;
      saveState();
      renderAll();
      const first = $("#from-name");
      if (first && !isMobile()) first.focus({ preventScroll: true });
    },
  };

  /* ---------- Design (layout + accent) ---------- */
  const Design = {
    dialog: $("#design"),
    swatchesEl: $("#swatches"),

    init() {
      Design.buildSwatches();
      on($("#open-design"), "click", Design.open);
      on($("#design-close"), "click", Design.close);
      on(Design.dialog, "click", (e) => { if (e.target === Design.dialog) Design.close(); });
      $$('input[name="design"]').forEach((r) => on(r, "change", () => Design.set({ design: r.value })));
      Design.apply();
    },

    buildSwatches() {
      ACCENTS.forEach((a) => {
        const label = document.createElement("label");
        label.className = "swatch";
        label.innerHTML = '<input class="swatch__input sr-only" type="radio" name="accent" /><span class="swatch__dot"></span><span class="sr-only"></span>';
        const input = label.querySelector("input");
        input.value = a.hex;
        label.querySelector(".sr-only:last-child").textContent = a.label;
        label.querySelector(".swatch__dot").style.setProperty("--swatch", a.hex);
        on(input, "change", () => Design.set({ accent: a.hex }));
        Design.swatchesEl.appendChild(label);
      });
    },

    set(patch) {
      Object.assign(state, patch);
      saveState();
      Design.apply();
    },

    apply() {
      sheetEl.dataset.design = state.design;
      document.documentElement.style.setProperty("--doc-accent", state.accent);
      $$('input[name="design"]').forEach((r) => { r.checked = r.value === state.design; });
      $$('input[name="accent"]').forEach((r) => { r.checked = r.value === state.accent; });
      updatePageGuides();
    },

    open() {
      if (typeof Design.dialog.showModal === "function") Design.dialog.showModal();
      else Design.dialog.setAttribute("open", "");
      const checked = $('input[name="design"]:checked', Design.dialog);
      if (checked) checked.focus();
    },

    close() {
      if (typeof Design.dialog.close === "function") Design.dialog.close();
      else Design.dialog.removeAttribute("open");
      $("#open-design").focus({ preventScroll: true });
    },
  };

  /* ---------- About dialog ---------- */
  const About = {
    dialog: $("#about"),

    init() {
      if (!About.dialog) return;
      on($("#open-about"), "click", () => About.open());
      on($("#open-privacy"), "click", () => About.open($("#about-privacy")));
      on($("#about-close"), "click", () => About.close());
      on(About.dialog, "click", (e) => {
        if (e.target === About.dialog) About.close();
      });
    },

    open(focusTarget) {
      if (typeof About.dialog.showModal === "function") About.dialog.showModal();
      else About.dialog.setAttribute("open", "");
      if (focusTarget) {
        focusTarget.focus();
        focusTarget.scrollIntoView({ block: "start" });
      }
    },

    close() {
      if (typeof About.dialog.close === "function") About.dialog.close();
      else About.dialog.removeAttribute("open");
    },
  };

  /* ---------- Init ---------- */
  function bindAllValues() {
    $$("[data-bind]").forEach((el) => {
      const val = getByPath(state, el.dataset.bind);
      if (val != null) el.value = fieldValue(val);
    });
    $("#currency").value = state.currency;
    $("#remember").checked = !!state.remember;
  }

  function renderAll() {
    bindAllValues();
    renderItems();
    layout();
  }

  Theme.init();
  Actions.init();
  About.init();
  Design.init();
  bindFields();
  renderItems();
  layout();
  on(window, "resize", layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
})();
