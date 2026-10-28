/* Builds a vector A4 PDF (selectable text, no browser header/footer) with jsPDF. */
(() => {
  "use strict";

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 18;
  const FOOTER_RESERVE = 10;
  const RIGHT = PAGE_W - MARGIN;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const PT_TO_MM = 0.3528;
  const LINE_HEIGHT = 1.45;
  const ROW_PAD = 2.5;
  const COLOR = { ink: [24, 24, 27], muted: [98, 98, 107], rule: [228, 228, 231], white: [255, 255, 255] };
  const SIZE = { name: 11, body: 10, small: 7.5, total: 13 };
  const COL = {
    descW: 94,
    qtyX: 134,
    rateX: 162,
    partyGap: 94,
    partyW: 80,
    totalsX: 118,
  };
  const META_GAP = 38;
  const META_MAX_W = 36;
  const TOP_BAR_H = 5;
  const BAND_TINT = 0.07;
  const INSET = 2;
  const TOTALS_INSET = 3;
  const ACCENT_FALLBACK = "#18181b";

  /* One entry per design. Keep in step with the [data-design] rules in styles.css. */
  const DESIGNS = {
    minimal: { font: "helvetica", scale: 1, titleSize: 24, upper: false, titleAccent: false, topBar: false, headRule: "hair", tableHead: "rule", banded: false, total: "rule" },
    classic: { font: "times", scale: 1.08, titleSize: 26, upper: false, titleAccent: true, topBar: false, headRule: "thin", tableHead: "ruled", banded: false, total: "rule" },
    modern: { font: "helvetica", scale: 1, titleSize: 24, upper: false, titleAccent: true, topBar: true, headRule: "hair", tableHead: "accent", banded: true, total: "accent" },
    bold: { font: "helvetica", scale: 1, titleSize: 34, upper: true, titleAccent: false, topBar: false, headRule: "heavy", tableHead: "filled", banded: false, total: "block" },
  };

  // jsPDF's built-in fonts only cover WinAnsi; anything else would print as garbage.
  const WIN_ANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
  function clean(value) {
    const str = String(value == null ? "" : value).replace(/ /g, " ").replace(/−/g, "-");
    let out = "";
    for (const ch of str) {
      const code = ch.codePointAt(0);
      const ok = ch === "\n" || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRA.includes(ch);
      if (ok) { out += ch; continue; }
      const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
      out += base !== ch && /^[\x20-\x7e]+$/.test(base) ? base : "?";
    }
    return out;
  }

  function hexToRgb(hex) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex || "") || /^#([0-9a-f]{6})$/i.exec(ACCENT_FALLBACK);
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  const tint = (rgb, amount) => rgb.map((c) => Math.round(255 - (255 - c) * amount));

  function build(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    const { state, totals, money, date } = data;
    const theme = DESIGNS[state.design] || DESIGNS.minimal;
    const accent = hexToRgb(state.accent);
    const inset = theme.tableHead === "filled" || theme.banded ? INSET : 0;
    const totalsInset = theme.total === "block" ? TOTALS_INSET : 0;
    const limitY = PAGE_H - MARGIN - FOOTER_RESERVE;
    const lh = (size) => size * theme.scale * PT_TO_MM * LINE_HEIGHT;
    let y = MARGIN;

    const style = (size = SIZE.body, bold = false, color = COLOR.ink) => {
      doc.setFont(theme.font, bold ? "bold" : "normal");
      doc.setFontSize(size * theme.scale);
      doc.setTextColor(...color);
    };
    const put = (str, x, atY, size, bold, color, align = "left") => {
      style(size, bold, color);
      doc.text(Array.isArray(str) ? str.map(clean) : clean(str), x, atY, { align, baseline: "top", lineHeightFactor: LINE_HEIGHT });
    };
    const wrap = (str, width, size, bold) => {
      style(size, bold);
      return doc.splitTextToSize(clean(str), width);
    };
    const fit = (str, maxW, size, bold) => {
      style(size, bold);
      let s = clean(str);
      while (s.length > 1 && doc.getTextWidth(s) > maxW) s = s.slice(0, -1);
      return s === clean(str) ? s : `${s.trimEnd()}…`;
    };
    const line = (x1, atY, x2, width, color) => {
      doc.setDrawColor(...color);
      doc.setLineWidth(width);
      doc.line(x1, atY, x2, atY);
    };
    const fill = (x, atY, w, h, color) => {
      doc.setFillColor(...color);
      doc.rect(x, atY, w, h, "F");
    };
    const hair = (atY) => line(MARGIN, atY, RIGHT, 0.2, COLOR.rule);

    const drawTopBar = () => { if (theme.topBar) fill(0, 0, PAGE_W, TOP_BAR_H, accent); };
    const newPage = () => { doc.addPage(); drawTopBar(); y = MARGIN; };
    const ensure = (height, redraw) => {
      if (y + height <= limitY) return;
      newPage();
      if (redraw) redraw();
    };

    /* Header: title + number / dates */
    drawTopBar();
    const titleH = theme.titleSize * theme.scale * PT_TO_MM;
    put(theme.upper ? "INVOICE" : "Invoice", MARGIN, y, theme.titleSize, true, theme.titleAccent ? accent : COLOR.ink);
    const metaY = y + Math.max(0, titleH - 10);
    const meta = [
      ["NUMBER", fit(state.number || "-", META_MAX_W, SIZE.body, false)],
      ["ISSUED", date(state.issueDate) || "-"],
      ["DUE", date(state.dueDate) || "-"],
    ];
    meta.forEach(([label, value], i) => {
      const x = RIGHT - META_GAP * (meta.length - 1 - i);
      put(label, x, metaY + 1, SIZE.small, false, COLOR.muted, "right");
      put(value, x, metaY + 5, SIZE.body, false, COLOR.ink, "right");
    });
    y += Math.max(titleH, 10) + 6;
    if (theme.headRule === "heavy") fill(MARGIN, y, CONTENT_W, 1.1, accent);
    else if (theme.headRule === "thin") line(MARGIN, y, RIGHT, 0.35, accent);
    else hair(y);
    y += 8;

    /* Parties */
    const party = (label, p, x) => {
      let py = y;
      put(label, x, py, SIZE.small, false, COLOR.muted);
      py += lh(SIZE.small) + 1;
      if (p.name) {
        const lines = wrap(p.name, COL.partyW, SIZE.name, true);
        put(lines, x, py, SIZE.name, true, COLOR.ink);
        py += lines.length * lh(SIZE.name);
      }
      if (p.details) {
        const lines = wrap(p.details, COL.partyW, SIZE.body, false);
        put(lines, x, py + 0.5, SIZE.body, false, COLOR.muted);
        py += lines.length * lh(SIZE.body) + 0.5;
      }
      return py;
    };
    const fromEnd = party("FROM", state.from, MARGIN);
    const toEnd = party("BILL TO", state.to, MARGIN + COL.partyGap);
    y = Math.max(fromEnd, toEnd) + 10;

    /* Line items */
    const descX = MARGIN + inset;
    const amountX = RIGHT - inset;
    const tableHead = () => {
      const labelH = lh(SIZE.small);
      const kind = theme.tableHead;
      const labelColor = kind === "filled" ? COLOR.white : kind === "accent" ? accent : COLOR.muted;
      const bold = kind === "accent";
      let top = y;
      if (kind === "filled") {
        fill(MARGIN, y, CONTENT_W, labelH + 6, accent);
        top = y + 3;
      } else if (kind === "ruled") {
        line(MARGIN, y, RIGHT, 0.35, accent);
        top = y + 2;
      }
      put("DESCRIPTION", descX, top, SIZE.small, bold, labelColor);
      put("QTY", COL.qtyX, top, SIZE.small, bold, labelColor, "right");
      put("RATE", COL.rateX, top, SIZE.small, bold, labelColor, "right");
      put("AMOUNT", amountX, top, SIZE.small, bold, labelColor, "right");
      if (kind === "filled") y += labelH + 6;
      else if (kind === "ruled") { y = top + labelH + 2; line(MARGIN, y, RIGHT, 0.35, accent); }
      else { y += labelH + 2; line(MARGIN, y, RIGHT, kind === "accent" ? 0.5 : 0.2, kind === "rule" || kind === "accent" ? accent : COLOR.rule); }
    };
    ensure(20);
    tableHead();
    const band = tint(accent, BAND_TINT);
    state.items.forEach((item, index) => {
      const lines = wrap(item.description || "-", COL.descW, SIZE.body, false);
      const height = lines.length * lh(SIZE.body) + ROW_PAD * 2;
      ensure(height, tableHead);
      if (theme.banded && index % 2 === 1) fill(MARGIN, y, CONTENT_W, height, band);
      const top = y + ROW_PAD;
      put(lines, descX, top, SIZE.body, false, COLOR.ink);
      const qty = String(+(Number(item.quantity) || 0).toFixed(2));
      put(qty, COL.qtyX, top, SIZE.body, false, COLOR.ink, "right");
      put(money(Number(item.rate) || 0), COL.rateX, top, SIZE.body, false, COLOR.ink, "right");
      put(money(data.lineAmount(item)), amountX, top, SIZE.body, false, COLOR.ink, "right");
      y += height;
      if (!theme.banded) hair(y);
    });
    if (theme.banded) hair(y);
    y += 8;

    /* Totals */
    const rows = [["Subtotal", money(totals.subtotal)]];
    if (Number(state.discount) > 0) rows.push([`Discount (${Number(state.discount)}%)`, `-${money(totals.discountAmount)}`]);
    if (Number(state.tax) > 0) rows.push([`Tax (${Number(state.tax)}%)`, money(totals.taxAmount)]);
    const rowH = lh(SIZE.body) + 1.5;
    const blockH = lh(SIZE.total) + 6;
    ensure(rows.length * rowH + blockH + 8);
    rows.forEach(([label, value]) => {
      put(label, COL.totalsX + totalsInset, y, SIZE.body, false, COLOR.muted);
      put(value, RIGHT - totalsInset, y, SIZE.body, false, COLOR.ink, "right");
      y += rowH;
    });
    y += 1;
    if (theme.total === "block") {
      fill(COL.totalsX, y, RIGHT - COL.totalsX, blockH, accent);
      put("Total", COL.totalsX + totalsInset, y + 3.5, SIZE.total, true, COLOR.white);
      put(money(totals.total), RIGHT - totalsInset, y + 3.5, SIZE.total, true, COLOR.white, "right");
      y += blockH + 10;
    } else {
      line(COL.totalsX, y, RIGHT, theme.total === "accent" ? 0.5 : 0.3, accent);
      y += 3;
      const totalColor = theme.total === "accent" ? accent : COLOR.ink;
      put("Total", COL.totalsX, y, SIZE.total, true, totalColor);
      put(money(totals.total), RIGHT, y, SIZE.total, true, totalColor, "right");
      y += lh(SIZE.total) + 10;
    }

    /* Notes (flows across pages line by line) */
    const notes = String(state.notes || "").trim();
    if (notes) {
      const lines = wrap(notes, CONTENT_W, SIZE.body, false);
      ensure(lh(SIZE.small) + lh(SIZE.body) * 2 + 2);
      put("NOTES", MARGIN, y, SIZE.small, false, COLOR.muted);
      y += lh(SIZE.small) + 1.5;
      lines.forEach((text) => {
        ensure(lh(SIZE.body));
        put(text, MARGIN, y, SIZE.body, false, COLOR.ink);
        y += lh(SIZE.body);
      });
    }

    /* Page numbers on multi-page invoices */
    const pages = doc.getNumberOfPages();
    if (pages > 1) {
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        put(`Page ${i} of ${pages}`, PAGE_W / 2, PAGE_H - MARGIN, SIZE.small, false, COLOR.muted, "center");
      }
    }

    doc.setProperties({ title: clean(state.number || "Invoice"), subject: "Invoice", creator: "Invoicer" });
    return doc;
  }

  window.InvoicePdf = { build };
})();
