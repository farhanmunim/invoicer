/* One entry per design. Keep in step with the [data-design] rules in css/designs.css. */

export const DESIGNS = {
  minimal: { layout: "standard", titleSize: 24, upper: false, titleAccent: false, topBar: false, headRule: "hair", tableHead: "rule", banded: false, total: "rule" },
  modern: { layout: "letterhead", titleSize: 24, upper: false, titleAccent: true, topBar: true, headRule: null, tableHead: "accent", banded: true, total: "accent" },
  bold: { layout: "hero", titleSize: 34, upper: true, titleAccent: false, topBar: false, headRule: "heavy", tableHead: "filled", banded: false, total: "block" },
  centered: { layout: "centered", titleSize: 24, upper: false, titleAccent: false, topBar: false, headRule: "hair", tableHead: "rule", banded: false, total: "rule" },
};
