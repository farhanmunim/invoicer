(() => {
  "use strict";

  const STORAGE_KEY = "invoicer.current.v1";
  const SAVED_DETAILS_KEY = "invoicer.saved-details.v1";
  const THEME_KEY = "invoicer.theme";
  const CURRENCY_SYMBOLS = { GBP: "\u00A3", USD: "$" };
  const LOCALE_BY_CURRENCY = { GBP: "en-GB", USD: "en-US" };

  /* ---------- State ---------- */
  const defaultState = () => ({
    number: "INV-0001",
    issueDate: today(),
    dueDate: addDays(today(), 14),
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

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function addDays(iso, days) {
    const d = new Date(iso);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  /* ---------- Persistence ---------- */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return { ...defaultState(), ...parsed };
    } catch {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  let state = loadState();

  function loadSavedDetails() {
    try {
      const raw = localStorage.getItem(SAVED_DETAILS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function writeSavedDetails() {
    localStorage.setItem(SAVED_DETAILS_KEY, JSON.stringify({
      from: { ...state.from },
      notes: state.notes,
    }));
  }

  function clearSavedDetails() {
    localStorage.removeItem(SAVED_DETAILS_KEY);
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
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }
  applyTheme(localStorage.getItem(THEME_KEY) || "light");

  document.getElementById("theme-toggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
  });

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
    if (!iso) return "";
    const locale = LOCALE_BY_CURRENCY[state.currency] || "en-GB";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  }

  /* ---------- Calculations (avoid FP drift by rounding at boundaries) ---------- */
  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

  function computeTotals() {
    const subtotal = state.items.reduce((sum, it) => {
      return sum + round2((Number(it.quantity) || 0) * (Number(it.rate) || 0));
    }, 0);
    const discountAmount = round2(subtotal * ((Number(state.discount) || 0) / 100));
    const afterDiscount = round2(subtotal - discountAmount);
    const taxAmount = round2(afterDiscount * ((Number(state.tax) || 0) / 100));
    const total = round2(afterDiscount + taxAmount);
    return {
      subtotal: round2(subtotal),
      discountAmount,
      taxAmount,
      total,
    };
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
    const inputs = document.querySelectorAll("[data-bind]");
    inputs.forEach((el) => {
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

    const rememberEl = document.getElementById("remember");
    rememberEl.checked = !!state.remember;
    rememberEl.addEventListener("change", () => {
      state.remember = rememberEl.checked;
      if (state.remember) writeSavedDetails();
      else clearSavedDetails();
      saveState();
    });

    const currencyEl = document.getElementById("currency");
    currencyEl.value = state.currency;
    currencyEl.addEventListener("change", () => {
      state.currency = currencyEl.value;
      persistAndRender();
    });
  }

  /* ---------- Items rendering ---------- */
  const itemsEl = document.getElementById("items");
  const template = document.getElementById("item-template");

  function renderItems() {
    itemsEl.textContent = "";
    state.items.forEach((item) => {
      const node = template.content.firstElementChild.cloneNode(true);
      node.dataset.id = item.id;
      node.querySelector('[data-field="description"]').value = item.description;
      node.querySelector('[data-field="quantity"]').value = item.quantity;
      node.querySelector('[data-field="rate"]').value = item.rate;
      node.querySelector('[data-field="amount"]').textContent = formatMoney(
        (Number(item.quantity) || 0) * (Number(item.rate) || 0)
      );

      const amountEl = node.querySelector('[data-field="amount"]');
      node.addEventListener("input", (e) => {
        const field = e.target.dataset.field;
        if (!field) return;
        const value = e.target.type === "number" ? Number(e.target.value) : e.target.value;
        item[field] = value;
        amountEl.textContent = formatMoney(
          (Number(item.quantity) || 0) * (Number(item.rate) || 0)
        );
        persistAndRender();
      });

      node.querySelector(".item__remove").addEventListener("click", () => {
        state.items = state.items.filter((i) => i.id !== item.id);
        if (state.items.length === 0) state.items.push(newItem());
        saveState();
        renderItems();
        renderPreview();
      });

      itemsEl.appendChild(node);
    });
  }

  document.getElementById("add-item").addEventListener("click", () => {
    state.items.push(newItem());
    saveState();
    renderItems();
    renderPreview();
  });

  /* ---------- Preview rendering ---------- */
  const previewItemsEl = document.getElementById("preview-items");

  function renderPreview() {
    const totals = computeTotals();

    document.querySelectorAll("[data-out]").forEach((el) => {
      const key = el.dataset.out;
      if (key === "subtotal") el.textContent = formatMoney(totals.subtotal);
      else if (key === "discountAmount") el.textContent = `\u2212 ${formatMoney(totals.discountAmount)}`;
      else if (key === "taxAmount") el.textContent = formatMoney(totals.taxAmount);
      else if (key === "total") el.textContent = formatMoney(totals.total);
      else if (key === "issueDate" || key === "dueDate") el.textContent = formatDate(state[key]);
      else {
        const val = getByPath(state, key);
        el.textContent = val || placeholderFor(key);
      }
    });

    previewItemsEl.textContent = "";
    state.items.forEach((it) => {
      const tr = document.createElement("tr");
      const amount = (Number(it.quantity) || 0) * (Number(it.rate) || 0);
      tr.innerHTML = `
        <td class="invoice__td invoice__td--desc"></td>
        <td class="invoice__td invoice__td--num"></td>
        <td class="invoice__td invoice__td--num"></td>
        <td class="invoice__td invoice__td--num"></td>
      `;
      const cells = tr.querySelectorAll("td");
      cells[0].textContent = it.description || "—";
      cells[1].textContent = (Number(it.quantity) || 0).toString();
      cells[2].textContent = formatMoney(Number(it.rate) || 0);
      cells[3].textContent = formatMoney(amount);
      previewItemsEl.appendChild(tr);
    });

    toggleRow("discount", Number(state.discount) > 0);
    toggleRow("tax", Number(state.tax) > 0);
    toggleRow("notes", !!state.notes.trim());
  }

  function toggleRow(name, shouldShow) {
    document.querySelectorAll(`[data-row="${name}"]`).forEach((el) => {
      el.hidden = !shouldShow;
    });
  }

  function placeholderFor(key) {
    const map = {
      "from.name": "Your business",
      "from.details": "Your address",
      "to.name": "Client",
      "to.details": "Client address",
      number: "",
      notes: "",
    };
    return map[key] || "";
  }

  /* ---------- Persist + render ---------- */
  function persistAndRender() {
    saveState();
    renderPreview();
  }

  /* ---------- Actions ---------- */
  document.getElementById("download").addEventListener("click", async () => {
    const filename = `${state.number || "Invoice"}.pdf`;
    const preview = document.getElementById("preview");

    if (!window.html2canvas || !window.jspdf) {
      const originalTitle = document.title;
      document.title = state.number || "Invoice";
      window.print();
      setTimeout(() => { document.title = originalTitle; }, 500);
      return;
    }

    const btn = document.getElementById("download");
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Preparing…";

    const root = document.documentElement;
    const previousTheme = root.dataset.theme;
    root.dataset.theme = "light";

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
      const originalTitle = document.title;
      document.title = state.number || "Invoice";
      window.print();
      setTimeout(() => { document.title = originalTitle; }, 500);
    } finally {
      if (previousTheme) root.dataset.theme = previousTheme;
      else delete root.dataset.theme;
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  });

  document.getElementById("reset").addEventListener("click", () => {
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
  });

  /* ---------- About modal ---------- */
  const aboutEl = document.getElementById("about");
  function openAbout() {
    aboutEl.hidden = false;
    aboutEl.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeAbout() {
    aboutEl.hidden = true;
    aboutEl.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  document.getElementById("open-about").addEventListener("click", openAbout);
  aboutEl.addEventListener("click", (e) => {
    if (e.target.hasAttribute("data-close")) closeAbout();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !aboutEl.hidden) closeAbout();
  });

  /* ---------- Init ---------- */
  function renderAll() {
    bindAllValues();
    renderItems();
    renderPreview();
  }

  function bindAllValues() {
    document.querySelectorAll("[data-bind]").forEach((el) => {
      const val = getByPath(state, el.dataset.bind);
      if (val != null) el.value = val;
    });
    document.getElementById("currency").value = state.currency;
    document.getElementById("remember").checked = !!state.remember;
  }

  bindFields();
  renderItems();
  renderPreview();
})();
