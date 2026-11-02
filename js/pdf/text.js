/* Text support for the PDF.
   jsPDF's built-in fonts only cover WinAnsi. Text with any other character (Cyrillic, Greek,
   Polish ł, CJK, Arabic, emoji…) is drawn as an image of the glyphs instead, so it always
   renders correctly (but is not selectable). These helpers decide when, and measure/wrap it. */

export const RASTER_SCALE = 4;
export const RASTER_LINE = 1.2;
export const RASTER_BASELINE = 0.62;
export const PX_PER_MM = 96 / 25.4;
const PT_TO_PX = 96 / 72;
const RASTER_FONTS = '"Geist", "Helvetica Neue", Helvetica, Arial, "Noto Sans", sans-serif';
const WIN_ANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

export const normalize = (value) => String(value == null ? "" : value).replace(/ /g, " ").replace(/−/g, "-");
export const clean = normalize;

export function needsRaster(value) {
  for (const ch of normalize(value)) {
    const code = ch.codePointAt(0);
    const ok = ch === "\n" || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRA.includes(ch);
    if (!ok) return true;
  }
  return false;
}

export function rasterFont(size, bold) {
  return `${bold ? 700 : 400} ${size * PT_TO_PX}px ${RASTER_FONTS}`;
}

let measureContext = null;
export function rasterWidth(text, size, bold) {
  if (!measureContext) measureContext = document.createElement("canvas").getContext("2d");
  measureContext.font = rasterFont(size, bold);
  return measureContext.measureText(text).width / PX_PER_MM;
}

export function wrapRaster(value, maxW, size, bold) {
  const lines = [];
  normalize(value).split("\n").forEach((paragraph) => {
    let line = "";
    paragraph.split(" ").forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (rasterWidth(candidate, size, bold) <= maxW) { line = candidate; return; }
      if (line) lines.push(line);
      if (rasterWidth(word, size, bold) <= maxW) { line = word; return; }
      let chunk = "";
      for (const ch of word) {
        if (chunk && rasterWidth(chunk + ch, size, bold) > maxW) { lines.push(chunk); chunk = ch; } else chunk += ch;
      }
      line = chunk;
    });
    lines.push(line);
  });
  return lines;
}
