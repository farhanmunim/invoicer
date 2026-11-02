// Apply theme before first paint to avoid a flash of the wrong theme.
(function () {
  try {
    const stored = localStorage.getItem("invoicer.theme");
    const theme = stored || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#09090b" : "#ffffff");
  } catch {
    // storage or matchMedia unavailable: keep the default (light) theme
  }
})();
