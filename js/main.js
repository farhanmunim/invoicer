/* Entry point: wires the modules together once the DOM is ready (module scripts are deferred). */
import { initAbout } from "./about.js";
import { initActions } from "./actions.js";
import { initDesign } from "./design.js";
import { bindFields } from "./fields.js";
import { initItems, renderItems } from "./items.js";
import { layout, layoutAfterFonts } from "./layout.js";
import { hydrateRememberedDetails } from "./store.js";
import { initTheme } from "./theme.js";
import { initToast } from "./toast.js";

hydrateRememberedDetails();
initTheme();
initToast();
initActions();
initAbout();
initDesign();
initItems();
bindFields();
renderItems();
layout();
window.addEventListener("resize", layout);
layoutAfterFonts();
