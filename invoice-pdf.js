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
  const FONT = "helvetica";
  const COLOR = { ink: [24, 24, 27], muted: [98, 98, 107], rule: [228, 228, 231] };
  const SIZE = { title: 24, name: 11, body: 10, small: 7.5, total: 13 };
  const COL = {
    descW: 94,
    qtyX: 134,
    rateX: 162,
    amountX: RIGHT,
    partyGap: 94,
    partyW: 80,
    totalsX: 118,
  };
  const META_GAP = 38;
  const META_MAX_W = 36;

  const lh = (size) => size * PT_TO_MM * LINE_HEIGHT;

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

  function build(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    const { state, totals, money, date } = data;
    const limitY = PAGE_H - MARGIN - FOOTER_RESERVE;
    let y = MARGIN;

    const style = (size = SIZE.body, bold = false, color = COLOR.ink) => {
      doc.setFont(FONT, bold ? "bold" : "normal");
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
    const rule = (atY, color = COLOR.rule) => {
      doc.setDrawColor(...color);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, atY, RIGHT, atY);
    };
    const newPage = () => { doc.addPage(); y = MARGIN; };
    const ensure = (height, redraw) => {
      if (y + height <= limitY) return;
      newPage();
      if (redraw) redraw();
    };

    /* Header: title + number / dates */
    put("Invoice", MARGIN, y, SIZE.title, true, COLOR.ink);
    const meta = [
      ["NUMBER", fit(state.number || "-", META_MAX_W, SIZE.body, false)],
      ["ISSUED", date(state.issueDate) || "-"],
      ["DUE", date(state.dueDate) || "-"],
    ];
    meta.forEach(([label, value], i) => {
      const x = RIGHT - META_GAP * (meta.length - 1 - i);
      put(label, x, y + 1, SIZE.small, false, COLOR.muted, "right");
      put(value, x, y + 5, SIZE.body, false, COLOR.ink, "right");
    });
    y += 16;
    rule(y);
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
    const tableHead = () => {
      put("DESCRIPTION", MARGIN, y, SIZE.small, false, COLOR.muted);
      put("QTY", COL.qtyX, y, SIZE.small, false, COLOR.muted, "right");
      put("RATE", COL.rateX, y, SIZE.small, false, COLOR.muted, "right");
      put("AMOUNT", COL.amountX, y, SIZE.small, false, COLOR.muted, "right");
      y += lh(SIZE.small) + 2;
      rule(y, COLOR.ink);
    };
    ensure(20);
    tableHead();
    state.items.forEach((item) => {
      const lines = wrap(item.description || "-", COL.descW, SIZE.body, false);
      const height = lines.length * lh(SIZE.body) + ROW_PAD * 2;
      ensure(height, tableHead);
      const top = y + ROW_PAD;
      put(lines, MARGIN, top, SIZE.body, false, COLOR.ink);
      const qty = String(+(Number(item.quantity) || 0).toFixed(2));
      put(qty, COL.qtyX, top, SIZE.body, false, COLOR.ink, "right");
      put(money(Number(item.rate) || 0), COL.rateX, top, SIZE.body, false, COLOR.ink, "right");
      put(money(data.lineAmount(item)), COL.amountX, top, SIZE.body, false, COLOR.ink, "right");
      y += height;
      rule(y);
    });
    y += 8;

    /* Totals */
    const rows = [["Subtotal", money(totals.subtotal)]];
    if (Number(state.discount) > 0) rows.push([`Discount (${Number(state.discount)}%)`, `-${money(totals.discountAmount)}`]);
    if (Number(state.tax) > 0) rows.push([`Tax (${Number(state.tax)}%)`, money(totals.taxAmount)]);
    const rowH = lh(SIZE.body) + 1.5;
    ensure(rows.length * rowH + lh(SIZE.total) + 8);
    rows.forEach(([label, value]) => {
      put(label, COL.totalsX, y, SIZE.body, false, COLOR.muted);
      put(value, RIGHT, y, SIZE.body, false, COLOR.ink, "right");
      y += rowH;
    });
    y += 1;
    doc.setDrawColor(...COLOR.ink);
    doc.setLineWidth(0.3);
    doc.line(COL.totalsX, y, RIGHT, y);
    y += 3;
    put("Total", COL.totalsX, y, SIZE.total, true, COLOR.ink);
    put(money(totals.total), RIGHT, y, SIZE.total, true, COLOR.ink, "right");
    y += lh(SIZE.total) + 10;

    /* Notes (flows across pages line by line) */
    const notes = String(state.notes || "").trim();
    if (notes) {
      const lines = wrap(notes, CONTENT_W, SIZE.body, false);
      ensure(lh(SIZE.small) + lh(SIZE.body) * 2 + 2);
      put("NOTES", MARGIN, y, SIZE.small, false, COLOR.muted);
      y += lh(SIZE.small) + 1.5;
      lines.forEach((line) => {
        ensure(lh(SIZE.body));
        put(line, MARGIN, y, SIZE.body, false, COLOR.ink);
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
