/*
 * Trainer section background videos.
 * - Sources are attached only when a card nears the viewport (zero cost to first paint / LCP / TBT).
 * - Skipped entirely on Save-Data, 2G / slow-2G and prefers-reduced-motion: the poster image stays.
 * - Plays only while visible and while the tab is visible.
 * - Every step is wrapped so a failure can only ever leave the poster image showing.
 */
(function () {
  "use strict";

  function safe(fn) {
    return function () {
      try { return fn.apply(this, arguments); } catch (e) { /* never break the page */ }
    };
  }

  safe(function () {
    var nodes = document.querySelectorAll("video[data-bg-video]");
    if (!nodes.length) return;
    var videos = Array.prototype.slice.call(nodes);

    // Honour user / network preferences: keep the poster only.
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var slow = !!(conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "")));
    var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    // Make sure no native UI can ever appear, whatever the browser does.
    videos.forEach(safe(function (v) {
      v.controls = false;
      v.removeAttribute("controls");
      v.muted = true;
      v.defaultMuted = true;
      v.loop = true;
      v.setAttribute("playsinline", "");
      v.setAttribute("webkit-playsinline", "");
      v.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    }));

    if (slow || reduce) return;

    var failed = typeof WeakSet === "function" ? new WeakSet() : null;
    var visible = typeof Map === "function" ? new Map() : null;

    function fail(v) {
      safe(function () {
        if (failed) failed.add(v);
        v.pause();
        while (v.firstChild) v.removeChild(v.firstChild);
        v.removeAttribute("src");
        v.load(); // poster image remains visible
      })();
    }

    function attach(v) {
      if (v.getAttribute("data-ready") === "1" || (failed && failed.has(v))) return;
      v.setAttribute("data-ready", "1");

      var list = [
        ["video/webm", v.getAttribute("data-src-webm")],
        ["video/mp4", v.getAttribute("data-src-mp4")]
      ];
      var added = 0;
      list.forEach(function (item) {
        if (!item[1]) return;
        if (v.canPlayType && !v.canPlayType(item[0])) return;
        var s = document.createElement("source");
        s.src = item[1];
        s.type = item[0];
        // A failing last <source> means nothing playable: fall back to the poster.
        s.addEventListener("error", safe(function () {
          if (s === v.lastElementChild) fail(v);
        }));
        v.appendChild(s);
        added++;
      });
      if (!added) { fail(v); return; }

      v.addEventListener("error", safe(function () { fail(v); }));
      v.setAttribute("preload", "metadata");
      v.load();
      sync(v);
    }

    function play(v) {
      if (failed && failed.has(v) || v.getAttribute("data-ready") !== "1") return;
      var p = v.play();
      if (p && typeof p.catch === "function") p.catch(function () { /* autoplay blocked: poster stays */ });
    }

    function sync(v) {
      safe(function () {
        var inView = visible ? visible.get(v) : true;
        if (inView && !document.hidden) play(v); else v.pause();
      })();
    }

    if ("IntersectionObserver" in window && visible) {
      var io = new IntersectionObserver(safe(function (entries) {
        entries.forEach(function (en) {
          visible.set(en.target, en.isIntersecting);
          if (en.isIntersecting) attach(en.target);
          sync(en.target);
        });
      }), { rootMargin: "200px 0px", threshold: 0.01 });
      videos.forEach(function (v) { visible.set(v, false); io.observe(v); });
    } else {
      // Very old browsers: load once the page is idle.
      var go = safe(function () { videos.forEach(attach); });
      if (document.readyState === "complete") setTimeout(go, 1500);
      else window.addEventListener("load", function () { setTimeout(go, 1500); });
    }

    document.addEventListener("visibilitychange", safe(function () { videos.forEach(sync); }));
  })();
})();
