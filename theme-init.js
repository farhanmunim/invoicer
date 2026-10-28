// Apply theme before first paint to avoid a flash of the wrong theme.
(function () {
  try {
    var stored = localStorage.getItem("invoicer.theme");
    var theme = stored || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#09090b" : "#ffffff");
  } catch {
    // storage or matchMedia unavailable: keep the default (light) theme
  }
})();
