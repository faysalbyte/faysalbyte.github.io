/* skeleton.js - section skeletons for the home page (pairs with skeleton.css).
   - Section 1: the overlay is static markup in index.html (paints instantly); this file only fits the
     outline to the portrait and removes the overlay once the portrait and fonts have resolved.
   - Sections 3, 4, 5: overlays are built here and start animating only when the section enters the viewport.
   Nothing is stored, nothing is fetched, no globals except one flag read by enhance.js.
   Tune the timings in CFG below. */
(function () {
  "use strict";

  var CFG = {
    heroMinMs: 1400,          /* earliest moment the hero overlay may leave, counted from navigation start */
    countSeconds: 20,         /* Section 3 countdown */
    contactAfterMs: 20000,    /* Section 3: show a plain contact link if the assistant is still missing after this */
    typeMs: 4000,             /* Section 4 typing window (keep between 3000 and 5000) */
    typeHoldMs: 350,
    certMinMs: 1600,          /* Section 5 minimum / maximum time on screen */
    certMaxMs: 8000,
    rootMargin: "0px 0px -20% 0px"
  };
  var AI_ID = "ai-voice-assistant-root";
  var IMG_SIDE = 1254;        /* the portrait is square; the outline path is drawn in these units */
  var ORANGE = "#FF6B00";
  var ORANGE_HI = "#FFB27A";

  /* tells enhance.js that its older AI skeleton is replaced by this one */
  window.__sxSkeletonOwnsAI = true;

  /* ---------- helpers ---------- */
  function reduced() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function wait(ms) {
    return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
  }
  function ensurePositioned(node) {
    if (window.getComputedStyle(node).position === "static") node.style.position = "relative";
  }
  function remove(node) {
    if (node && node.parentNode) node.parentNode.removeChild(node);
  }
  function leave(layer, after) {
    layer.classList.add("is-leaving");
    window.setTimeout(function () { remove(layer); if (after) after(); }, 1000);
  }
  /* runs cb once, the first time the target enters the viewport */
  function onceVisible(target, cb) {
    if (!("IntersectionObserver" in window)) { cb(); return; }
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) { io.disconnect(); cb(); return; }
      }
    }, { rootMargin: CFG.rootMargin, threshold: 0 });
    io.observe(target);
  }
  function imageReady(img) {
    return new Promise(function (resolve) {
      if (!img) { resolve(); return; }
      function settle() {
        if (img.decode) img.decode().then(resolve, resolve); else resolve();
      }
      if (img.complete) settle();
      else {
        img.addEventListener("load", settle, { once: true });
        img.addEventListener("error", function () { resolve(); }, { once: true });
      }
    });
  }
  function fontsReady() {
    return (document.fonts && document.fonts.ready) ? document.fonts.ready.then(function () {}, function () {}) : Promise.resolve();
  }
  function graphemes(text) {
    try {
      if (window.Intl && Intl.Segmenter) {
        var out = [];
        var it = new Intl.Segmenter("bn", { granularity: "grapheme" }).segment(text)[Symbol.iterator]();
        for (var r = it.next(); !r.done; r = it.next()) out.push(r.value.segment);
        return out;
      }
    } catch (e) { /* fall through */ }
    return Array.from(text);
  }

  /* ====================================================================
     SECTION 1 - hero
     ==================================================================== */
  function initHero() {
    var layer = document.getElementById("sx-hero");
    if (!layer) return;
    var hero = layer.parentNode;
    var img = hero.querySelector(".hero-photo img");
    var svg = layer.querySelector(".sx-hero-svg");
    var ro = null;

    /* put the outline exactly over the portrait: same maths as object-fit: cover + object-position */
    function fit() {
      if (!svg || !img) return;
      var cw = svg.clientWidth, ch = svg.clientHeight;
      if (!cw || !ch) return;
      var pos = (window.getComputedStyle(img).objectPosition || "50% 50%").split(" ");
      var px = pos[0].indexOf("%") > -1 ? parseFloat(pos[0]) / 100 : 0.5;
      var py = (pos[1] || "50%").indexOf("%") > -1 ? parseFloat(pos[1]) / 100 : 0.5;
      var s = Math.max(cw / IMG_SIDE, ch / IMG_SIDE);
      var vw = cw / s, vh = ch / s;
      svg.setAttribute("viewBox",
        ((IMG_SIDE - vw) * px).toFixed(2) + " " + ((IMG_SIDE - vh) * py).toFixed(2) + " " + vw.toFixed(2) + " " + vh.toFixed(2));
      svg.setAttribute("preserveAspectRatio", "none");
    }
    fit();
    if ("ResizeObserver" in window && svg) { ro = new ResizeObserver(fit); ro.observe(svg); }
    else window.addEventListener("resize", fit);

    function done() {
      layer.classList.add("is-done");
      window.setTimeout(function () {
        if (ro) ro.disconnect(); else window.removeEventListener("resize", fit);
        remove(layer);
      }, 1000);
    }
    /* resolved = portrait decoded + fonts ready. The CSS loop keeps playing until then. */
    Promise.all([imageReady(img), fontsReady()]).then(function () {
      var elapsed = window.performance && performance.now ? performance.now() : CFG.heroMinMs;
      return wait(Math.max(0, CFG.heroMinMs - elapsed));
    }).then(done);
  }

  /* ====================================================================
     SECTION 3 - AI assistant: 10 s countdown over a binary stream
     ==================================================================== */
  function Matrix(canvas) {
    var ctx = canvas.getContext("2d");
    var w = 0, h = 0, fs = 16, cols = 0, rows = 0, streams = [], nextBrand = 0;
    var BRANDS = [Array.from("FAYSALBYTE"), graphemes("মোঃ ফয়সাল")];
    var MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    var BN = "\"Noto Sans Bengali\", \"Hind Siliguri\", \"Nirmala UI\", \"Kalpurush\", sans-serif";

    function rnd(a, b) { return a + Math.random() * (b - a); }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fs = Math.max(13, Math.min(22, Math.round(w / 64)));
      cols = Math.ceil(w / fs);
      rows = Math.ceil(h / fs);
      streams = [];
      for (var i = 0; i < cols; i++) {
        var len = Math.round(rnd(18, 30));
        streams.push({ len: len, speed: rnd(4, 11), off: rnd(0, rows + len), cyc: 0, brand: null });
      }
    }

    function bit(i, row, tick) {
      return (((i * 73856093) ^ (row * 19349663) ^ (tick * 83492791)) & 1) ? "1" : "0";
    }

    function injectBrand(t) {
      var live = 0, i, s;
      for (i = 0; i < streams.length; i++) if (streams[i].brand) live++;
      if (live >= 5) return;
      for (var tries = 0; tries < 12; tries++) {
        i = (Math.random() * streams.length) | 0;
        s = streams[i];
        if (s.brand) continue;
        var cycle = rows + s.len;
        var p = ((s.off - s.speed * t) % cycle + cycle) % cycle;
        var head = p - s.len;
        var chars = BRANDS[(Math.random() * BRANDS.length) | 0];
        if (head >= 0 && head <= rows - chars.length) { s.brand = chars; return; }
      }
    }

    function draw(t) {
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      if (t >= nextBrand) { injectBrand(t); nextBrand = t + rnd(0.6, 1.8); }
      var tick = Math.floor(t * 4);
      for (var i = 0; i < cols; i++) {
        var s = streams[i];
        var cycle = rows + s.len;
        var raw = s.off - s.speed * t;
        var cyc = Math.floor(raw / cycle);
        if (cyc !== s.cyc) { s.cyc = cyc; s.brand = null; }
        var head = (raw % cycle + cycle) % cycle - s.len;     /* moves upward over time */
        var x = i * fs + fs / 2;
        for (var k = 0; k < s.len; k++) {
          var row = Math.floor(head) + k;
          if (row < 0 || row >= rows) continue;
          var a = Math.pow(1 - k / s.len, 1.4);
          var brandChar = s.brand && k < s.brand.length ? s.brand[k] : null;
          if (brandChar) {
            if (brandChar === " ") continue;
            ctx.globalAlpha = Math.min(1, a + 0.35);
            ctx.font = "800 " + fs + "px " + (/[^\x00-\x7f]/.test(brandChar) ? BN : MONO);
            ctx.fillStyle = ORANGE_HI;
            ctx.shadowColor = ORANGE; ctx.shadowBlur = 10;
            ctx.fillText(brandChar, x, row * fs);
            ctx.shadowBlur = 0;
          } else {
            ctx.globalAlpha = a * 0.85;
            ctx.font = "600 " + fs + "px " + MONO;
            ctx.fillStyle = k === 0 ? ORANGE_HI : ORANGE;
            ctx.fillText(bit(i, row, tick), x, row * fs);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    return { resize: resize, draw: draw };
  }

  function initAI() {
    var root = document.getElementById(AI_ID);
    if (!root) return;
    ensurePositioned(root);

    var layer = el("div", "sx-layer sx-ai");
    layer.setAttribute("data-sx-ai", "");
    var canvas = el("canvas", "sx-matrix");
    canvas.setAttribute("aria-hidden", "true");
    var stage = el("div", "sx-stage");
    var spoon = el("div", "sx-spoon");
    spoon.setAttribute("aria-hidden", "true");
    var count = el("span", "sx-count", String(CFG.countSeconds));
    spoon.appendChild(count);
    var statusBox = el("div", "sx-statusbox");
    var status = el("div", "sx-status");
    statusBox.appendChild(status);
    var live = el("div", "sx-sr");
    live.setAttribute("role", "status");
    stage.appendChild(spoon);
    stage.appendChild(statusBox);
    layer.appendChild(canvas);
    layer.appendChild(stage);
    layer.appendChild(live);
    root.appendChild(layer);
    root.setAttribute("aria-busy", "true");

    var matrix = Matrix(canvas);
    var started = false, finished = false, waiting = false, linked = false;
    var t0 = 0, lastDraw = 0, shown = -1, raf = 0, ro = null;

    function setStatus(left) {
      status.textContent = left > 0
        ? "Initializing Md Faysal Hossain's Neural AI Core... Please wait " + left + "s"
        : "Waiting for Neural Core...";
    }
    setStatus(CFG.countSeconds);

    /* the backend replaces the section's contents when it mounts; put the overlay back so it can fade out */
    var mo = null;
    if ("MutationObserver" in window) {
      mo = new MutationObserver(function () {
        if (!finished && layer.parentNode !== root) root.appendChild(layer);
      });
      mo.observe(root, { childList: true });
    }

    function isReady() {
      if (root.hasAttribute("data-state")) return true;
      for (var i = 0; i < root.children.length; i++) {
        var c = root.children[i];
        if (c === layer || c.tagName === "NOSCRIPT" || c.hasAttribute("data-sx-copy")) continue;
        return true;
      }
      return false;
    }

    function finish() {
      if (finished) return;
      finished = true;
      status.textContent = "Neural Core online";
      live.textContent = "AI assistant ready.";
      root.removeAttribute("aria-busy");
      leave(layer, function () {
        window.cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        if (mo) mo.disconnect();
      });
    }

    function frame(now) {
      raf = window.requestAnimationFrame(frame);
      var t = (now - t0) / 1000;
      var motion = !reduced();
      if (motion && now - lastDraw >= 33) { lastDraw = now; matrix.draw(t); }
      var left = Math.max(0, CFG.countSeconds - Math.floor(t));
      spoon.style.setProperty("--sx-prog", Math.min(100, (t / CFG.countSeconds) * 100).toFixed(1));
      if (left !== shown) {
        shown = left;
        count.textContent = String(left);
        if (motion) { count.classList.remove("is-tick"); void count.offsetWidth; count.classList.add("is-tick"); }
        setStatus(left);
      }
      if (left === 0) {
        if (isReady()) { finish(); return; }
        if (!waiting) { waiting = true; setStatus(0); }
        if (!linked && (now - t0) > CFG.contactAfterMs) {
          linked = true;
          var p = el("div", "sx-status");
          p.appendChild(document.createTextNode("Taking longer than usual? "));
          var a = el("a", "", "Contact MD Faysal Hossain directly");
          a.href = "contact.html";
          p.appendChild(a);
          p.appendChild(document.createTextNode("."));
          statusBox.appendChild(p);
        }
      }
    }

    function start() {
      if (started) return;
      started = true;
      t0 = window.performance && performance.now ? performance.now() : Date.now();
      matrix.resize();
      if ("ResizeObserver" in window) { ro = new ResizeObserver(function () { matrix.resize(); }); ro.observe(canvas); }
      live.textContent = "Loading the AI assistant.";
      if (reduced()) matrix.draw(1.5);
      raf = window.requestAnimationFrame(frame);
    }
    onceVisible(root, start);
  }

  /* ====================================================================
     SECTION 4 - training experience: centred typing banner (no countdown)
     ==================================================================== */
  function initTrainer() {
    var sec = document.getElementById("trainer");
    if (!sec || reduced()) return;
    ensurePositioned(sec);
    var TEXT = "Training Experience";
    var layer = el("div", "sx-layer sx-train");
    layer.setAttribute("aria-hidden", "true");
    var stage = el("div", "sx-stage");
    var banner = el("div", "sx-banner");
    var typed = el("span", "sx-typed");
    var txt = document.createTextNode("");
    typed.appendChild(txt);
    typed.appendChild(el("span", "sx-caret"));
    banner.appendChild(el("span", "sx-full", TEXT));   /* invisible full text keeps the banner centred while it types */
    banner.appendChild(typed);
    stage.appendChild(banner);
    layer.appendChild(stage);
    sec.appendChild(layer);

    onceVisible(sec, function () {
      var span = Math.max(3000, Math.min(5000, CFG.typeMs));
      var begin = performance.now();
      (function step(now) {
        var p = Math.min(1, (now - begin) / span);
        txt.nodeValue = TEXT.slice(0, Math.ceil(p * TEXT.length));
        if (p < 1) { window.requestAnimationFrame(step); return; }
        window.setTimeout(function () { leave(layer); }, CFG.typeHoldMs);
      })(begin);
    });
  }

  /* ====================================================================
     SECTION 5 - skills path: certificate outline, border trace, laser scan
     ==================================================================== */
  var CERT_SVG =
    "<svg class=\"sx-cert\" viewBox=\"0 0 600 420\" aria-hidden=\"true\" focusable=\"false\">" +
    "<defs><linearGradient id=\"sxLaser\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">" +
    "<stop offset=\"0\" stop-color=\"#FF6B00\" stop-opacity=\"0\"/><stop offset=\".5\" stop-color=\"#FF6B00\" stop-opacity=\".95\"/>" +
    "<stop offset=\"1\" stop-color=\"#FF6B00\" stop-opacity=\"0\"/></linearGradient>" +
    "<clipPath id=\"sxClip\"><rect x=\"24\" y=\"24\" width=\"552\" height=\"372\" rx=\"6\"/></clipPath></defs>" +
    "<rect class=\"ln\" x=\"4\" y=\"4\" width=\"592\" height=\"412\" rx=\"14\"/>" +
    "<rect class=\"ln\" x=\"24\" y=\"24\" width=\"552\" height=\"372\" rx=\"6\"/>" +
    "<rect class=\"run\" pathLength=\"1\" x=\"4\" y=\"4\" width=\"592\" height=\"412\" rx=\"14\"/>" +
    "<path class=\"bar\" d=\"M170 84h260M120 128h360M150 164h300\"/>" +
    "<path class=\"bar\" d=\"M90 330h150M360 330h150\"/>" +
    "<circle class=\"seal\" cx=\"300\" cy=\"262\" r=\"42\"/><circle class=\"seal\" cx=\"300\" cy=\"262\" r=\"29\"/>" +
    "<path class=\"seal\" d=\"M281 298l-13 46 32-15 32 15-13-46\"/>" +
    "<g clip-path=\"url(#sxClip)\"><rect class=\"laser\" x=\"24\" y=\"0\" width=\"552\" height=\"10\"/></g></svg>";

  function initJourney() {
    var sec = document.getElementById("journey");
    if (!sec || reduced()) return;
    ensurePositioned(sec);
    var layer = el("div", "sx-layer sx-certs");
    layer.setAttribute("aria-hidden", "true");
    var stage = el("div", "sx-stage");
    stage.innerHTML = CERT_SVG;
    layer.appendChild(stage);
    sec.appendChild(layer);

    onceVisible(sec, function () {
      /* resolved = the first certificate images are decoded (or failed), after a minimum look at the animation */
      var imgs = Array.prototype.slice.call(sec.querySelectorAll("img"), 0, 4);
      var assets = Promise.all(imgs.map(function (im) {
        if (im.loading === "lazy") im.loading = "eager";
        return imageReady(im);
      }));
      Promise.race([Promise.all([assets, wait(CFG.certMinMs)]), wait(CFG.certMaxMs)]).then(function () { leave(layer); });
    });
  }

  /* ---------- go ---------- */
  initHero();
  function boot() { initAI(); initTrainer(); initJourney(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
