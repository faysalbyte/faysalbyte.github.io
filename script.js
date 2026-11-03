(function () {
  "use strict";

  var root = document.documentElement;
  var $ = function (selector, scope) { return (scope || document).querySelector(selector); };
  var $$ = function (selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); };
  var clamp = function (value, low, high) { return Math.min(high, Math.max(low, value)); };
  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");

  var hero = $(".hero");
  var photo = $(".hero-photo");
  var path = $("#path");
  var line = path ? $(".path-line", path) : null;

  (function ticker() {
    var el = $("#typing");
    if (!el) return;

    var phrases = [
      "MERN stack applications",
      "responsive websites",
      "eCommerce stores",
      "SEO-ready pages",
      "Android apps with Kotlin",
      "training programs"
    ];
    var index = 0;
    var count = phrases[0].length;
    var deleting = true;
    var timer = 0;

    function render() { el.textContent = phrases[index].slice(0, count); }

    function step() {
      var delay;
      if (deleting) {
        count--;
        if (count <= 0) {
          count = 0;
          deleting = false;
          index = (index + 1) % phrases.length;
          delay = 380;
        } else {
          delay = 28;
        }
      } else {
        count++;
        if (count >= phrases[index].length) {
          count = phrases[index].length;
          deleting = true;
          delay = 2200;
        } else {
          delay = 55;
        }
      }
      render();
      timer = setTimeout(step, delay);
    }

    function stop() { clearTimeout(timer); timer = 0; }
    function start() {
      stop();
      if (motion.matches || document.hidden) return;
      timer = setTimeout(step, 2200);
    }
    function showStatic() {
      stop();
      index = 0;
      count = phrases[0].length;
      deleting = true;
      render();
    }

    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
    var onMotion = function () { if (motion.matches) showStatic(); else start(); };
    if (motion.addEventListener) motion.addEventListener("change", onMotion);
    start();
  })();

 var items = [];
  if (path) {
    items = $$(".cert", path).map(function (el) {
      return { el: el, nodeEl: $(".cert-node", el), top: 0, bottom: 0, node: 0, passed: false };
    });

    if ("IntersectionObserver" in window && !motion.matches) {
      path.classList.add("anim");
      var reveal = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            reveal.unobserve(entry.target);
          }
        });
      }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
      $$(".stage", path).forEach(function (el) { reveal.observe(el); });
      items.forEach(function (item) { reveal.observe(item.el); });
    }

    if (motion.addEventListener) {
      motion.addEventListener("change", function () {
        if (motion.matches) path.classList.remove("anim");
      });
    }
  }

  /* ---------- global stacked sections (pairs with the "GLOBAL STACKED SECTIONS" CSS) ---------- */
  var main = $("#main");
  var footer = $(".site-footer");
  var layers = main && document.body.classList.contains("home")
    ? $$("#main > section, #main > .page-body > section") : [];
  var secs = layers.filter(function (el) { return el !== hero; });
  var stackOn = false;
  var stackH = [];
  var stackFooterH = -1;
  var stackQueued = false;

  function pageY() { return window.pageYOffset || root.scrollTop; }

  /* where a section sits in normal flow (ignores any sticky offset) */
  function naturalTop(el) {
    var top = main.getBoundingClientRect().top + pageY();
    for (var i = 0; i < layers.length && layers[i] !== el; i++) top += layers[i].getBoundingClientRect().height;
    return top;
  }
  /* how far sticky has pushed a section away from its normal position */
  function stackShift(el) {
    return stackOn && el ? el.getBoundingClientRect().top + pageY() - naturalTop(el) : 0;
  }

  function stackMeasure() {
    stackQueued = false;
    if (!secs.length) return;
    var hs = secs.map(function (el) { return Math.floor(el.getBoundingClientRect().height); });   /* reads first... */
    var fh = footer ? footer.getBoundingClientRect().height : 0;
    hs.forEach(function (h, i) {                                                                  /* ...then writes */
      if (stackH[i] !== h) { stackH[i] = h; secs[i].style.setProperty("--stack-h", h + "px"); }
    });
    if (fh !== stackFooterH) { stackFooterH = fh; document.body.style.setProperty("--footer-h", fh + "px"); }
    if (!stackOn) { stackOn = true; document.body.classList.add("is-stacked"); }
  }
  function requestStackMeasure() {
    if (stackQueued) return;
    stackQueued = true;
    requestAnimationFrame(stackMeasure);
  }

  if (secs.length) {
    stackMeasure();
    window.addEventListener("resize", requestStackMeasure, { passive: true });
    window.addEventListener("load", requestStackMeasure);
    window.addEventListener("pageshow", requestStackMeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(requestStackMeasure);
    if ("ResizeObserver" in window) {
      var stackRO = new ResizeObserver(requestStackMeasure);
      secs.forEach(function (el) { stackRO.observe(el); });
      if (footer) stackRO.observe(footer);
    }

    /* keyboard focus on something hidden under a later section: bring it back into view */
    document.addEventListener("focusin", function (event) {
      var target = event.target;
      requestAnimationFrame(function () {
        if (!stackOn || !target || !target.getBoundingClientRect) return;
        var sec = secs.filter(function (el) { return el.contains(target); })[0];
        if (!sec) return;
        var r = target.getBoundingClientRect();
        var cy = r.top + r.height / 2;
        if (cy > window.innerHeight) return;                       /* below the screen: the browser scrolls normally */
        if (cy >= 0) {
          var hit = document.elementFromPoint(r.left + r.width / 2, cy);
          if (hit && sec.contains(hit)) return;                    /* already visible */
        }
        var nat = naturalTop(sec) + (r.top - sec.getBoundingClientRect().top);
        window.scrollTo({ top: Math.max(0, nat - window.innerHeight * 0.4), behavior: "instant" });
      });
    });
  }
  var journeySec = path ? path.closest("section") : null;

  var m = { heroH: 0, lineTop: 0, lineH: 1 };
  var heroCovered = false;
  var currentIndex = -1;
  var frame = 0;
  var measureQueued = false;

  function measure() {
    measureQueued = false;
    var y = window.pageYOffset || root.scrollTop;
    if (hero) m.heroH = hero.offsetHeight || window.innerHeight;
    if (path && line) {
      var lineRect = line.getBoundingClientRect();
      var shift = stackShift(journeySec);   /* undo any sticky offset so positions stay in page coordinates */
      m.lineTop = lineRect.top + y - shift;
      m.lineH = Math.max(1, lineRect.height);
      items.forEach(function (item) {
        var rect = item.el.getBoundingClientRect();
        item.top = rect.top + y - shift;
        item.bottom = rect.bottom + y - shift;
        item.node = rect.top + y - shift + item.nodeEl.offsetTop + item.nodeEl.offsetHeight / 2;
      });
    }
  }

  function update() {
    frame = 0;
    var y = window.pageYOffset || root.scrollTop;
    var vh = window.innerHeight;

    /* hero curtain */
    if (hero) {
      var heroH = m.heroH || vh;
      hero.style.setProperty("--p", (motion.matches ? 0 : clamp(y / heroH, 0, 1)).toFixed(4));
      var covered = y >= heroH - 1;
      if (covered !== heroCovered) {
        heroCovered = covered;
        hero.classList.toggle("is-covered", covered);
      }
    }

    /* timeline spine, nodes, current card */
    if (path && line && items.length) {
      var marker = y + vh * 0.55;
      var fill = clamp(marker - m.lineTop, 0, m.lineH);
      path.style.setProperty("--fill-p", (fill / m.lineH).toFixed(4));

      var nearest = -1;
      var best = Infinity;
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var passed = item.node <= marker;
        if (passed !== item.passed) {
          item.passed = passed;
          item.el.classList.toggle("is-passed", passed);
        }
        var distance = marker < item.top ? item.top - marker : (marker > item.bottom ? marker - item.bottom : 0);
        if (distance < best) { best = distance; nearest = i; }
      }
      if (marker < m.lineTop || marker > m.lineTop + m.lineH) nearest = -1;
      if (nearest !== currentIndex) {
        if (currentIndex > -1) items[currentIndex].el.classList.remove("is-current");
        if (nearest > -1) items[nearest].el.classList.add("is-current");
        currentIndex = nearest;
      }
    }
  }

  function requestUpdate() { if (!frame) frame = requestAnimationFrame(update); }
  function requestMeasure() {
    if (measureQueued) return;
    measureQueued = true;
    requestAnimationFrame(function () { measure(); requestUpdate(); });
  }

  measure();
  update();

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestMeasure, { passive: true });
  window.addEventListener("load", requestMeasure);
  window.addEventListener("pageshow", requestMeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(requestMeasure);
  if ("ResizeObserver" in window) new ResizeObserver(requestMeasure).observe(document.body);

  /* ---------- 2b. pointer parallax on the portrait (mouse only) ---------- */
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");   /* live: follows device emulation switches */
  if (photo) {
    var targetX = 0, targetY = 0, currentX = 0, currentY = 0, running = false;

    var glide = function () {
      currentX += 0.06 * (targetX - currentX);
      currentY += 0.06 * (targetY - currentY);
      photo.style.setProperty("--mx", currentX.toFixed(2) + "px");
      photo.style.setProperty("--my", currentY.toFixed(2) + "px");
      if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
        requestAnimationFrame(glide);
      } else {
        running = false;
      }
    };

    window.addEventListener("mousemove", function (event) {
      if (!finePointer.matches || motion.matches || heroCovered) return;
      targetX = -18 * (event.clientX / window.innerWidth - 0.5);
      targetY = -12 * (event.clientY / window.innerHeight - 0.5);
      if (!running) {
        running = true;
        requestAnimationFrame(glide);
      }
    }, { passive: true });
  }
  /* ---------- Portrait image fallback (CSP-safe) ---------- */
var portraitImage = $(
  ".about .portrait.career .portrait-card > img"
);
var portraitFallback = $("#portraitFallback");

if (portraitImage && portraitFallback) {
  function showPortraitFallback() {
    portraitImage.style.display = "none";
    portraitFallback.style.display = "flex";
  }

  portraitImage.addEventListener("error", showPortraitFallback);

  // Handle an image that failed before the listener was attached.
  if (portraitImage.complete && portraitImage.naturalWidth === 0) {
    showPortraitFallback();
  }
}
})();


/* Google Review: Share / Copy link
 * Shares /share/google-review (a static page with its own Open Graph card image that
 * redirects to /#google-review). Native share sheet first, clipboard copy as fallback.
 * Fully self-contained and null-safe: if the markup is missing it does nothing. */
(function () {
  "use strict";

  var SHARE_PATH = "/share/google-review";
  var ANCHOR = "#google-review";
  var FALLBACK_ORIGIN = "https://faysalbyte.github.io";
  var TITLE = "Leave a Google Review for MD Faysal Hossain";
  var TEXT = "Worked with MD Faysal Hossain? Share your experience on Google. It takes less than a minute.";

  var toastEl = null;
  var toastTimer = 0;
  var busy = false;

  function buildUrl(group) {
    var path = SHARE_PATH;
    try {
      var custom = group && group.getAttribute("data-share-path");
      if (custom && custom.charAt(0) === "/" && custom.indexOf("//") !== 0) path = custom;
    } catch (e) { /* keep default */ }
    var origin = FALLBACK_ORIGIN;
    try {
      var o = window.location && window.location.origin;
      if (o && o !== "null" && /^https?:/i.test(o)) origin = o;
    } catch (e) { /* keep fallback */ }
    return origin + path + ANCHOR;
  }

  function showToast(message) {
    try {
      if (!toastEl) {
        toastEl = document.createElement("div");
        toastEl.className = "rv-toast";
        toastEl.setAttribute("role", "status");
        toastEl.setAttribute("aria-live", "polite");
        document.body.appendChild(toastEl);
      }
      toastEl.textContent = message;
      void toastEl.offsetWidth; // restart the transition if shown twice in a row
      toastEl.classList.add("show");
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(function () {
        if (toastEl) toastEl.classList.remove("show");
      }, 2400);
    } catch (e) { /* a toast must never break the page */ }
  }

  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var area = null;
      try {
        area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.setAttribute("aria-hidden", "true");
        area.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0;font-size:16px";
        document.body.appendChild(area);
        area.focus();
        area.select();
        area.setSelectionRange(0, text.length);
        var ok = document.execCommand && document.execCommand("copy");
        ok ? resolve() : reject(new Error("execCommand copy failed"));
      } catch (err) {
        reject(err);
      } finally {
        if (area && area.parentNode) area.parentNode.removeChild(area);
      }
    });
  }

  function copyText(text) {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function" && window.isSecureContext) {
        return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
      }
    } catch (e) { /* fall through */ }
    return legacyCopy(text);
  }

  function copyWithFeedback(url) {
    return copyText(url).then(
      function () { showToast("Copied!"); },
      function () {
        try { window.prompt("Copy this link:", url); } catch (e) { /* ignore */ }
      }
    );
  }

  function canNativeShare(payload) {
    try {
      if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
      if (typeof navigator.canShare === "function" && !navigator.canShare(payload)) return false;
      return true;
    } catch (e) { return false; }
  }

  function handle(action, group, button) {
    if (busy) return;
    var url = buildUrl(group);
    var payload = { title: TITLE, text: TEXT, url: url };
    busy = true;
    if (button) button.disabled = true;
    var done = function () { busy = false; if (button) button.disabled = false; };

    var task;
    try {
      if (action === "share" && canNativeShare(payload)) {
        task = navigator.share(payload).catch(function (err) {
          if (err && err.name === "AbortError") return;   // user closed the share sheet
          return copyWithFeedback(url);                    // any other failure: copy instead
        });
      } else {
        task = copyWithFeedback(url);
      }
    } catch (err) {
      task = copyWithFeedback(url);
    }
    Promise.resolve(task).then(done, done);
  }

  function init() {
    try {
      var groups = document.querySelectorAll(".rv-actions");
      if (!groups || !groups.length) return;
      Array.prototype.forEach.call(groups, function (group) {
        var buttons = group.querySelectorAll("[data-rv-action]");
        Array.prototype.forEach.call(buttons, function (button) {
          button.addEventListener("click", function (event) {
            try {
              event.preventDefault();
              event.stopPropagation();
              handle(button.getAttribute("data-rv-action"), group, button);
            } catch (err) {
              busy = false;
              button.disabled = false;
            }
          });
        });
      });
    } catch (e) { /* never break the page */ }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
