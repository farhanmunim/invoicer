/* Line items: renders the editable rows and handles add / remove. */
import { $, $$, on } from "./dom.js";
import { fieldValue, normalizeNumberField } from "./fields.js";
import { autosize } from "./layout.js";
import { newItem } from "./model.js";
import { getState, saveState } from "./store.js";
import { persistAndRender, renderTotals } from "./totals-view.js";

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

export function renderItems() {
  itemsEl.textContent = "";
  getState().items.forEach((item, index) => {
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
    node.addEventListener("change", (e) => {
      const field = e.target.dataset.field;
      if (field === "quantity" || field === "rate") normalizeNumberField(e.target, (v) => { item[field] = v; });
    });

    node.querySelector(".item__remove").addEventListener("click", () => {
      const state = getState();
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

export function initItems() {
  on($("#add-item"), "click", () => {
    const state = getState();
    state.items.push(newItem());
    saveState();
    renderItems();
    focusItem(state.items.length - 1);
  });
}
