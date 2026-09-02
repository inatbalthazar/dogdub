
!function(){try{var e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[n]="d0185ce5-d248-5349-9f15-42b6b471abf6")}catch(e){}}();
const t = [], o = [], c = Object.freeze({
  captureException(e, n = {}) {
    return o.length < 20 && o.push({ error: e, options: n }), "queued";
  }
});
window.ChoicerMonitoring || (window.ChoicerMonitoring = c);
const d = (e) => {
  e && t.length < 10 && t.push(e);
}, a = (e) => d(e.error), s = (e) => d(e.reason);
window.addEventListener("error", a);
window.addEventListener("unhandledrejection", s);
const r = async () => {
  try {
    const { initializeMonitoring: e } = await import("./browser-xN4dxw4e.js");
    if (e(), window.ChoicerMonitoring !== c) {
      for (const { error: n, options: w } of o)
        window.ChoicerMonitoring?.captureException?.(n, w);
      o.length = 0;
    }
    for (const n of t)
      window.ChoicerMonitoring?.captureException?.(n, {
        area: "frontend",
        stage: "startup"
      });
  } catch {
  } finally {
    window.removeEventListener("error", a), window.removeEventListener("unhandledrejection", s);
  }
}, i = window.requestIdleCallback ? (e) => window.requestIdleCallback(e, { timeout: 2500 }) : (e) => window.setTimeout(e, 1200);
document.readyState === "complete" ? i(r) : window.addEventListener("load", () => i(r), { once: !0 });
//# sourceMappingURL=monitoring.js.map

//# debugId=d0185ce5-d248-5349-9f15-42b6b471abf6
