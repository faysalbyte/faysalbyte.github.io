/*!
 * viewport-sync.js - keeps every viewport-dependent measurement in step with the real viewport.
 *
 * Why: when the browser switches between desktop / phone / tablet (DevTools device emulation,
 * rotating a device, docking or undocking DevTools) some values are only updated a frame or two after
 * the first "resize" event, and some (hover / pointer capability, pixel ratio) are not announced
 * by "resize" at all. This module reads the true dimensions, waits for them to settle, and then
 * announces one change to everything else.
 *
 * What it does (and nothing more):
 *   - publishes --sx-vw / --sx-vh (CSS pixels) on <html>. No existing rule reads them, so nothing moves.
 *   - fires ONE "sx:viewport" event on window when width, height, pixel ratio or pointer type changed.
 *   - if the change was NOT announced by a native "resize" (ResizeObserver, visualViewport,
 *     pointer or pixel-ratio change), fires one synthetic "resize" so older listeners re-measure too.
 *
 * Cost: no timers while idle, no polling, one rAF per change burst plus a single 160 ms settle check.
 * It never writes layout properties, so CLS is unaffected. Silent: it never writes to the console.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var vv = window.visualViewport || null;
  var hasRAF = typeof window.requestAnimationFrame === "function";
  var last = { w: -1, h: -1, r: -1, p: "" };
  var frame = 0;
  var settle = 0;
  var emitting = false;
  var nativeResize = false;
  var dprQuery = null;
  var pointerQuery = window.matchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)") : null;

  function read() {
    return {
      w: root.clientWidth || window.innerWidth || 0,
      h: window.innerHeight || root.clientHeight || 0,
      r: window.devicePixelRatio || 1,
      p: pointerQuery && pointerQuery.matches ? "fine" : "touch"
    };
  }

  function same(a, b) {
    return a.w === b.w && a.h === b.h && a.r === b.r && a.p === b.p;
  }

  function publish(state, announceResize) {
    try {
      root.style.setProperty("--sx-vw", state.w + "px");
      root.style.setProperty("--sx-vh", state.h + "px");
    } catch (e) { /* never break the page */ }
    emitting = true;
    try {
      window.dispatchEvent(new CustomEvent("sx:viewport", { detail: state }));
      if (announceResize) window.dispatchEvent(new Event("resize"));
    } catch (e) { /* very old browser: the native events still work */ }
    emitting = false;
  }

  function check() {
    var state = read();
    if (same(state, last)) return;
    var announce = !nativeResize;
    last = state;
    publish(state, announce);
  }

  function run() {
    frame = 0;
    check();
  }

  function schedule() {
    if (!frame) frame = hasRAF ? window.requestAnimationFrame(run) : window.setTimeout(run, 16);
    /* one late re-check: some engines finish applying the new size a frame after the event */
    window.clearTimeout(settle);
    settle = window.setTimeout(function () { settle = 0; nativeResize = false; check(); }, 160);
  }

  /* DPR changes are only visible through a resolution media query, which must be re-armed each time */
  function armDpr() {
    if (!window.matchMedia) return;
    try {
      if (dprQuery && dprQuery.removeEventListener) dprQuery.removeEventListener("change", onDpr);
      dprQuery = window.matchMedia("(resolution: " + (window.devicePixelRatio || 1) + "dppx)");
      if (dprQuery.addEventListener) dprQuery.addEventListener("change", onDpr);
    } catch (e) { /* optional */ }
  }
  function onDpr() { armDpr(); schedule(); }

  function onNativeResize() {
    if (emitting) return;           /* ignore the synthetic event we fired ourselves */
    nativeResize = true;
    schedule();
  }
  function onOther() {
    if (emitting) return;
    schedule();
  }

  window.addEventListener("resize", onNativeResize, { passive: true });
  window.addEventListener("orientationchange", onOther, { passive: true });
  window.addEventListener("pageshow", onOther);
  window.addEventListener("load", onOther);
  if (vv && vv.addEventListener) vv.addEventListener("resize", onOther, { passive: true });
  if (pointerQuery && pointerQuery.addEventListener) pointerQuery.addEventListener("change", onOther);
  if ("ResizeObserver" in window) {
    try { new ResizeObserver(onOther).observe(root); } catch (e) { /* optional */ }
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onOther, function () {});
  armDpr();

  /* first reading: publish the variables now (no resize event is faked for the initial state) */
  last = read();
  publish(last, false);
})();
