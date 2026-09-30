(() => {
  "use strict";

  const STORAGE_KEY = "invoicer.current.v1";
  const SAVED_DETAILS_KEY = "invoicer.saved-details.v1";
  const THEME_KEY = "invoicer.theme";
  const PANEL_KEY = "invoicer.editor-collapsed";
  const CURRENCY_SYMBOLS = { GBP: "£", USD: "$" };
  const LOCALE_BY_CURRENCY = { GBP: "en-GB", USD: "en-US" };
  const THEME_COLOR = { light: "#ffffff", dark: "#09090b" };
  const DEFAULT_DUE_DAYS = 14;
  const MOBILE_QUERY = "(max-width: 640px)";
  const PRINT_TITLE_RESET_MS = 500;

  /* ---------- tiny DOM helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
  const mobileMedia = window.matchMedia(MOBILE_QUERY);
  const isMobile = () => mobileMedia.matches;

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

  /* ---------- Editor panel: desktop collapse + mobile drawer ---------- */
  const Panel = {
    el: $("#editor-panel"),
    toggle: $("#panel-toggle"),
    overlay: $("#overlay"),
    navEdit: $("#nav-edit"),
    navPreview: $("#nav-preview"),
    inertTargets: [$(".topbar"), $("#main"), $(".footer")],
    lastTrigger: null,

    init() {
      if (!Panel.el) return;
      if (storageGet(PANEL_KEY) === "1") Panel.setCollapsed(true, false);

      on(Panel.toggle, "click", () => {
        if (isMobile()) Panel.closeDrawer();
        else Panel.setCollapsed(!Panel.el.classList.contains("panel--collapsed"));
      });
      on(Panel.overlay, "click", Panel.closeDrawer);
      on(Panel.navEdit, "click", () => {
        if (Panel.isDrawerOpen()) Panel.closeDrawer();
        else Panel.openDrawer(Panel.navEdit);
      });
      on(Panel.navPreview, "click", () => {
        Panel.closeDrawer();
        $("#main").focus({ preventScroll: true });
      });
      on(document, "keydown", (e) => {
        if (e.key === "Escape" && Panel.isDrawerOpen()) Panel.closeDrawer();
      });
      on(mobileMedia, "change", () => {
        Panel.closeDrawer();
        Panel.syncToggleLabel();
      });
      Panel.syncToggleLabel();
    },

    setCollapsed(collapsed, persist = true) {
      Panel.el.classList.toggle("panel--collapsed", collapsed);
      if (persist) storageSet(PANEL_KEY, collapsed ? "1" : "0");
      Panel.syncToggleLabel();
    },

    syncToggleLabel() {
      if (!Panel.toggle) return;
      if (isMobile()) {
        Panel.toggle.setAttribute("aria-label", "Close editor");
        Panel.toggle.setAttribute("aria-expanded", "true");
        return;
      }
      const collapsed = Panel.el.classList.contains("panel--collapsed");
      Panel.toggle.setAttribute("aria-label", collapsed ? "Expand editor" : "Collapse editor");
      Panel.toggle.setAttribute("aria-expanded", String(!collapsed));
    },

    isDrawerOpen() {
      return Panel.el.classList.contains("panel--open");
    },

    openDrawer(trigger) {
      Panel.lastTrigger = trigger || null;
      Panel.el.classList.add("panel--open");
      if (Panel.overlay) {
        Panel.overlay.hidden = false;
        requestAnimationFrame(() => Panel.overlay.classList.add("is-visible"));
      }
      document.body.classList.add("drawer-open");
      Panel.inertTargets.forEach((t) => t && (t.inert = true));
      Panel.navEdit && Panel.navEdit.setAttribute("aria-expanded", "true");
      MobileNav.setActive("nav-edit");
      const first = $("#from-name");
      if (first) first.focus({ preventScroll: true });
    },

    closeDrawer() {
      if (!Panel.isDrawerOpen()) return;
      Panel.el.classList.remove("panel--open");
      if (Panel.overlay) {
        Panel.overlay.classList.remove("is-visible");
        Panel.overlay.hidden = true;
      }
      document.body.classList.remove("drawer-open");
      Panel.inertTargets.forEach((t) => t && (t.inert = false));
      Panel.navEdit && Panel.navEdit.setAttribute("aria-expanded", "false");
      MobileNav.setActive("nav-preview");
      if (Panel.lastTrigger) {
        Panel.lastTrigger.focus({ preventScroll: true });
        Panel.lastTrigger = null;
      }
    },
  };

  /* ---------- Mobile bottom nav ---------- */
  const MobileNav = {
    items: $$(".mobile-nav__item"),

    init() {
      on($("#nav-new"), "click", () => { Panel.closeDrawer(); Actions.newInvoice(); });
      on($("#nav-download"), "click", () => { Panel.closeDrawer(); Actions.downloadPdf(); });
    },

    setActive(id) {
      MobileNav.items.forEach((x) => x.classList.toggle("is-active", x.id === id));
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

  function bindFields() {
    // Enter inside a text field must never reload the page
    on($("#editor"), "submit", (e) => e.preventDefault());

    $$("[data-bind]").forEach((el) => {
      const path = el.dataset.bind;
      const val = getByPath(state, path);
      if (val != null) el.value = val;
      el.addEventListener("input", () => {
        const isNumber = el.type === "number";
        setByPath(state, path, isNumber ? Number(el.value) : el.value);
        if (state.remember && isRememberedPath(path)) writeSavedDetails();
        persistAndRender();
      });
    });

    const rememberEl = $("#remember");
    rememberEl.checked = !!state.remember;
    rememberEl.addEventListener("change", () => {
      state.remember = rememberEl.checked;
      if (state.remember) writeSavedDetails();
      else clearSavedDetails();
      saveState();
    });

    const currencyEl = $("#currency");
    currencyEl.value = state.currency;
    currencyEl.addEventListener("change", () => {
      state.currency = currencyEl.value;
      persistAndRender();
    });
  }

  /* ---------- Items rendering ---------- */
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

  function renderItems() {
    itemsEl.textContent = "";
    state.items.forEach((item, index) => {
      const node = template.content.firstElementChild.cloneNode(true);
      node.dataset.id = item.id;
      node.querySelector('[data-field="description"]').value = item.description;
      node.querySelector('[data-field="quantity"]').value = item.quantity;
      node.querySelector('[data-field="rate"]').value = item.rate;
      const amountEl = node.querySelector('[data-field="amount"]');
      amountEl.value = formatMoney(lineAmount(item));
      labelItem(node, index);

      node.addEventListener("input", (e) => {
        const field = e.target.dataset.field;
        if (!field) return;
        item[field] = e.target.type === "number" ? Number(e.target.value) : e.target.value;
        amountEl.value = formatMoney(lineAmount(item));
        persistAndRender();
      });

      node.querySelector(".item__remove").addEventListener("click", () => {
        const idx = state.items.findIndex((i) => i.id === item.id);
        state.items = state.items.filter((i) => i.id !== item.id);
        if (state.items.length === 0) state.items.push(newItem());
        saveState();
        renderItems();
        renderPreview();
        // Keep keyboard focus in the list after removal
        const rows = $$(".item", itemsEl);
        const target = rows[Math.min(idx, rows.length - 1)];
        if (target) target.querySelector('[data-field="description"]').focus();
      });

      itemsEl.appendChild(node);
    });
  }

  on($("#add-item"), "click", () => {
    state.items.push(newItem());
    saveState();
    renderItems();
    renderPreview();
    const rows = $$(".item", itemsEl);
    const last = rows[rows.length - 1];
    if (last) last.querySelector('[data-field="description"]').focus();
  });

  /* ---------- Preview rendering ---------- */
  const previewItemsEl = $("#preview-items");

  function renderPreview() {
    const totals = computeTotals();

    $$("[data-out]").forEach((el) => {
      const key = el.dataset.out;
      if (key === "subtotal") el.textContent = formatMoney(totals.subtotal);
      else if (key === "discountAmount") el.textContent = `− ${formatMoney(totals.discountAmount)}`;
      else if (key === "taxAmount") el.textContent = formatMoney(totals.taxAmount);
      else if (key === "total") el.textContent = formatMoney(totals.total);
      else if (key === "issueDate" || key === "dueDate") {
        el.textContent = formatDate(state[key]);
        if (parseISODate(state[key])) el.setAttribute("datetime", state[key]);
        else el.removeAttribute("datetime");
      } else {
        const val = getByPath(state, key);
        el.textContent = val || placeholderFor(key);
      }
    });

    previewItemsEl.textContent = "";
    state.items.forEach((it) => {
      const tr = document.createElement("tr");
      const cells = [
        ["invoice__td invoice__td--desc", it.description || "—"],
        ["invoice__td invoice__td--num", (Number(it.quantity) || 0).toString()],
        ["invoice__td invoice__td--num", formatMoney(Number(it.rate) || 0)],
        ["invoice__td invoice__td--num", formatMoney(lineAmount(it))],
      ];
      cells.forEach(([className, text]) => {
        const td = document.createElement("td");
        td.className = className;
        td.textContent = text;
        tr.appendChild(td);
      });
      previewItemsEl.appendChild(tr);
    });

    toggleRow("discount", Number(state.discount) > 0);
    toggleRow("tax", Number(state.tax) > 0);
    toggleRow("notes", !!String(state.notes || "").trim());
  }

  function toggleRow(name, shouldShow) {
    $$(`[data-row="${name}"]`).forEach((el) => { el.hidden = !shouldShow; });
  }

  function placeholderFor(key) {
    const map = {
      "from.name": "Your business",
      "from.details": "Your address",
      "to.name": "Client",
      "to.details": "Client address",
    };
    return map[key] || "";
  }

  /* ---------- Persist + render ---------- */
  function persistAndRender() {
    saveState();
    renderPreview();
  }

  /* ---------- Actions ---------- */
  const Actions = {
    downloadButtons: [$("#download"), $("#nav-download")].filter(Boolean),
    busy: false,

    init() {
      on($("#download"), "click", Actions.downloadPdf);
      on($("#reset"), "click", Actions.newInvoice);
    },

    setBusy(busy) {
      Actions.busy = busy;
      Actions.downloadButtons.forEach((btn) => {
        btn.disabled = busy;
        btn.setAttribute("aria-busy", String(busy));
      });
    },

    printFallback() {
      const originalTitle = document.title;
      document.title = state.number || "Invoice";
      window.print();
      setTimeout(() => { document.title = originalTitle; }, PRINT_TITLE_RESET_MS);
    },

    async downloadPdf() {
      if (Actions.busy) return;
      const filename = `${state.number || "Invoice"}.pdf`;
      const preview = $("#preview");

      if (!window.html2canvas || !window.jspdf) {
        Actions.printFallback();
        return;
      }

      Actions.setBusy(true);
      const root = document.documentElement;
      const previousTheme = root.getAttribute("data-theme");
      root.setAttribute("data-theme", "light");

      try {
        const canvas = await window.html2canvas(preview, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          windowWidth: preview.scrollWidth,
        });

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgW = pageW;
        const imgH = (canvas.height * imgW) / canvas.width;
        const imgData = canvas.toDataURL("image/png");

        if (imgH <= pageH) {
          pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH);
        } else {
          let remaining = imgH;
          let position = 0;
          while (remaining > 0) {
            pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
            remaining -= pageH;
            if (remaining > 0) {
              position -= pageH;
              pdf.addPage();
            }
          }
        }

        pdf.save(filename);
      } catch (err) {
        console.error("PDF export failed, falling back to print", err);
        Actions.printFallback();
      } finally {
        if (previousTheme) root.setAttribute("data-theme", previousTheme);
        else root.removeAttribute("data-theme");
        Actions.setBusy(false);
      }
    },

    newInvoice() {
      if (!confirm("Start a new invoice? Current data will be cleared.")) return;
      const fresh = defaultState();
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

  /* ---------- About dialog ---------- */
  const About = {
    dialog: $("#about"),

    init() {
      if (!About.dialog) return;
      on($("#open-about"), "click", () => About.open());
      on($("#open-privacy"), "click", () => About.open($("#about-privacy")));
      on($("#about-close"), "click", () => About.close());
      // Click on the backdrop (outside the inner panel) closes
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
  function renderAll() {
    bindAllValues();
    renderItems();
    renderPreview();
  }

  function bindAllValues() {
    $$("[data-bind]").forEach((el) => {
      const val = getByPath(state, el.dataset.bind);
      if (val != null) el.value = val;
    });
    $("#currency").value = state.currency;
    $("#remember").checked = !!state.remember;
  }

  Theme.init();
  Panel.init();
  MobileNav.init();
  Actions.init();
  About.init();
  bindFields();
  renderItems();
  renderPreview();
})();
