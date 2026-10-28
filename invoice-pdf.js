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
  const NOTES_SIDE_MAX_LINES = 6;
  const ACCENT_FALLBACK = "#18181b";

  /* One entry per design. Keep in step with the [data-design] rules in styles.css. */
  const DESIGNS = {
    minimal: { layout: "standard", titleSize: 24, upper: false, titleAccent: false, topBar: false, headRule: "hair", tableHead: "rule", banded: false, total: "rule" },
    modern: { layout: "letterhead", titleSize: 24, upper: false, titleAccent: true, topBar: true, headRule: null, tableHead: "accent", banded: true, total: "accent" },
    bold: { layout: "hero", titleSize: 34, upper: true, titleAccent: false, topBar: false, headRule: "heavy", tableHead: "filled", banded: false, total: "block" },
    centered: { layout: "centered", titleSize: 24, upper: false, titleAccent: false, topBar: false, headRule: "hair", tableHead: "rule", banded: false, total: "rule" },
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
    const title = theme.upper ? "INVOICE" : "Invoice";
    const titleColor = theme.titleAccent ? accent : COLOR.ink;
    const titleH = theme.titleSize * PT_TO_MM;
    const totalsInset = theme.total === "block" ? TOTALS_INSET : 0;
    const limitY = PAGE_H - MARGIN - FOOTER_RESERVE;
    const lh = (size) => size * PT_TO_MM * LINE_HEIGHT;
    let y = MARGIN;

    const style = (size = SIZE.body, bold = false, color = COLOR.ink) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
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

    /* Header + parties: arrangement depends on the design's layout */
    drawTopBar();
    const metaItems = [
      ["NUMBER", fit(state.number || "-", META_MAX_W, SIZE.body, false)],
      ["ISSUED", date(state.issueDate) || "-"],
      ["DUE", date(state.dueDate) || "-"],
    ];
    const headRule = () => {
      if (theme.headRule === "heavy") fill(MARGIN, y, CONTENT_W, 1.1, accent);
      else if (theme.headRule === "hair") hair(y);
    };
    const party = (label, p, x, startY, nameSize = SIZE.name) => {
      let py = startY;
      if (label) {
        put(label, x, py, SIZE.small, false, COLOR.muted);
        py += lh(SIZE.small) + 1;
      }
      if (p.name) {
        const lines = wrap(p.name, COL.partyW, nameSize, true);
        put(lines, x, py, nameSize, true, COLOR.ink);
        py += lines.length * lh(nameSize);
      }
      if (p.details) {
        const lines = wrap(p.details, COL.partyW, SIZE.body, false);
        put(lines, x, py + 0.5, SIZE.body, false, COLOR.muted);
        py += lines.length * lh(SIZE.body) + 0.5;
      }
      return py;
    };
    const parties = () => {
      const fromEnd = party("FROM", state.from, MARGIN, y);
      const toEnd = party("BILL TO", state.to, MARGIN + COL.partyGap, y);
      y = Math.max(fromEnd, toEnd) + 10;
    };

    if (theme.layout === "letterhead") {
      const fromEnd = party(null, state.from, MARGIN, y, 14);
      put(title, RIGHT, y, theme.titleSize, true, titleColor, "right");
      y = Math.max(fromEnd, y + titleH) + 10;
      const toEnd = party("BILL TO", state.to, MARGIN, y);
      let my = y;
      metaItems.forEach(([label, value]) => {
        put(label[0] + label.slice(1).toLowerCase(), RIGHT - 48, my, SIZE.body, false, COLOR.muted);
        put(value, RIGHT, my, SIZE.body, false, COLOR.ink, "right");
        my += lh(SIZE.body) + 1.5;
      });
      y = Math.max(toEnd, my) + 10;
    } else if (theme.layout === "hero") {
      put(title, MARGIN, y, theme.titleSize, true, titleColor);
      put("AMOUNT DUE", RIGHT, y + 1, SIZE.small, false, COLOR.muted, "right");
      put(money(totals.total), RIGHT, y + 4.5, 20, true, COLOR.ink, "right");
      put(`Due ${date(state.dueDate) || "-"}`, RIGHT, y + 4.5 + lh(20) + 0.5, SIZE.body, false, COLOR.muted, "right");
      y += Math.max(titleH, 4.5 + lh(20) + lh(SIZE.body)) + 6;
      headRule();
      y += 7;
      metaItems.forEach(([label, value], i) => {
        const x = MARGIN + i * 58;
        put(label, x, y, SIZE.small, false, COLOR.muted);
        put(value, x, y + 4, SIZE.body, false, COLOR.ink);
      });
      y += 17;
      parties();
    } else if (theme.layout === "centered") {
      put(title, PAGE_W / 2, y, theme.titleSize, true, titleColor, "center");
      y += titleH + 5;
      metaItems.forEach(([label, value], i) => {
        const x = PAGE_W / 2 + (i - 1) * META_GAP;
        put(label, x, y, SIZE.small, false, COLOR.muted, "center");
        put(value, x, y + 4, SIZE.body, false, COLOR.ink, "center");
      });
      y += 15;
      headRule();
      y += 8;
      parties();
    } else {
      put(title, MARGIN, y, theme.titleSize, true, titleColor);
      const metaY = y + Math.max(0, titleH - 10);
      metaItems.forEach(([label, value], i) => {
        const x = RIGHT - META_GAP * (metaItems.length - 1 - i);
        put(label, x, metaY + 1, SIZE.small, false, COLOR.muted, "right");
        put(value, x, metaY + 5, SIZE.body, false, COLOR.ink, "right");
      });
      y += Math.max(titleH, 10) + 6;
      headRule();
      y += 8;
      parties();
    }

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
      }
      put("DESCRIPTION", descX, top, SIZE.small, bold, labelColor);
      put("QTY", COL.qtyX, top, SIZE.small, bold, labelColor, "right");
      put("RATE", COL.rateX, top, SIZE.small, bold, labelColor, "right");
      put("AMOUNT", amountX, top, SIZE.small, bold, labelColor, "right");
      if (kind === "filled") y += labelH + 6;
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

    /* Totals, with short notes alongside (matches the sheet) */
    const rows = [["Subtotal", money(totals.subtotal)]];
    if (Number(state.discount) > 0) rows.push([`Discount (${Number(state.discount)}%)`, `-${money(totals.discountAmount)}`]);
    if (Number(state.tax) > 0) rows.push([`Tax (${Number(state.tax)}%)`, money(totals.taxAmount)]);
    const rowH = lh(SIZE.body) + 1.5;
    const blockH = lh(SIZE.total) + 6;
    const notes = String(state.notes || "").trim();
    const sideLines = notes ? wrap(notes, COL.descW, SIZE.body, false) : [];
    const sideBySide = sideLines.length > 0 && sideLines.length <= NOTES_SIDE_MAX_LINES;
    const totalsH = rows.length * rowH + 1 + (theme.total === "block" ? blockH : lh(SIZE.total) + 3);
    const notesH = lh(SIZE.small) + 1.5 + sideLines.length * lh(SIZE.body);
    ensure(Math.max(totalsH, sideBySide ? notesH : 0) + 8);
    const blockTop = y;
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
      y += blockH;
    } else {
      line(COL.totalsX, y, RIGHT, theme.total === "accent" ? 0.5 : 0.3, accent);
      y += 3;
      const totalColor = theme.total === "accent" ? accent : COLOR.ink;
      put("Total", COL.totalsX, y, SIZE.total, true, totalColor);
      put(money(totals.total), RIGHT, y, SIZE.total, true, totalColor, "right");
      y += lh(SIZE.total);
    }
    if (sideBySide) {
      put("NOTES", MARGIN, blockTop, SIZE.small, false, COLOR.muted);
      put(sideLines, MARGIN, blockTop + lh(SIZE.small) + 1.5, SIZE.body, false, COLOR.ink);
      y = Math.max(y, blockTop + notesH);
    }
    y += 10;

    /* Longer notes flow across pages below the totals, line by line */
    if (notes && !sideBySide) {
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
