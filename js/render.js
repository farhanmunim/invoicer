/* Full re-render of the editor from the current state (used after New / Undo). */
import { bindAllValues } from "./fields.js";
import { renderItems } from "./items.js";
import { layout } from "./layout.js";

export function renderAll() {
  bindAllValues();
  renderItems();
  layout();
}
