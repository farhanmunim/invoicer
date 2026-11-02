/* Hands a finished PDF to the user: share sheet on touch devices, a normal download elsewhere. */
import { URL_REVOKE_MS } from "./config.js";
import { isCoarsePointer } from "./dom.js";

export function safeFilename(name) {
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
export async function deliverPdf(blob, filename) {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (isCoarsePointer() && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
  }
  saveBlob(blob, filename);
}
