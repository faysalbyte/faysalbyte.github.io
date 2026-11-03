/* cert-toggle.js  -  Section 5: independent expand / minimize for the 15 certificate cards.
   Light by design: one delegated click listener, one IntersectionObserver, no timers running while idle.
   Height animates with the Web Animations API; words fade in with a CSS animation (opacity only). */
(function () {
  "use strict";

  var path = document.getElementById("path");
  if (!path) return;

  var cards = Array.prototype.slice.call(path.querySelectorAll(".cert-card"));
  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var EASE = "cubic-bezier(.22, 1, .36, 1)";
  var HEIGHT_MS = 420;
  var TYPE_MAX_MS = 1300;   /* whole reveal never takes longer than this, however long the text is */
  var states = new WeakMap();

  function Card(card) {
    this.card = card;
    this.desc = card.querySelector(".cert-desc");
    this.btn = card.querySelector(".cert-toggle");
    this.label = this.btn && this.btn.querySelector(".cert-toggle-label");
    this.full = this.desc ? this.desc.textContent.replace(/\s+/g, " ").trim() : "";
    this.open = false;
    this.anim = null;
    this.typeTimer = 0;
  }

  Card.prototype.sync = function () {
    this.btn.setAttribute("aria-expanded", this.open ? "true" : "false");
    this.label.textContent = this.open ? this.label.getAttribute("data-open") : this.label.getAttribute("data-closed");
    this.card.classList.toggle("is-expanded", this.open);
  };

  /* put the plain text node back (removes the per-word spans) */
  Card.prototype.plain = function () {
    window.clearTimeout(this.typeTimer);
    this.typeTimer = 0;
    this.desc.classList.remove("is-typing");
    if (this.desc.querySelector(".cw")) this.desc.textContent = this.full;
  };

  Card.prototype.stop = function () {
    if (this.anim) { this.anim.cancel(); this.anim = null; }
  };

  Card.prototype.animateHeight = function (from, to, done) {
    var self = this;
    var d = this.desc;
    if (motion.matches || !d.animate || Math.abs(from - to) < 2) { done(); return; }
    d.style.willChange = "height";
    var a = d.animate([{ height: from + "px" }, { height: to + "px" }], { duration: HEIGHT_MS, easing: EASE, fill: "forwards" });
    this.anim = a;
    a.onfinish = function () {
      if (self.anim !== a) return;
      done();
      a.cancel();
      self.anim = null;
      d.style.willChange = "";
    };
  };

  /* wrap words, leave the ones already visible in the 2-line state untouched, fade the rest in one by one */
  Card.prototype.type = function () {
    var d = this.desc;
    var words = this.full.split(" ");
    var frag = document.createDocumentFragment();
    var spans = [];
    for (var i = 0; i < words.length; i++) {
      var s = document.createElement("span");
      s.className = "cw";
      s.textContent = words[i];
      spans.push(s);
      frag.appendChild(s);
      if (i < words.length - 1) frag.appendChild(document.createTextNode(" "));
    }
    d.textContent = "";
    d.appendChild(frag);

    /* one layout read pass: which words sit beyond line 2? */
    var lh = parseFloat(window.getComputedStyle(d).lineHeight);
    if (!lh) lh = parseFloat(window.getComputedStyle(d).fontSize) * 1.6;
    var t0 = spans[0].offsetTop;
    var hidden = [];
    for (var j = 0; j < spans.length; j++) {
      if (spans[j].offsetTop - t0 >= lh * 2 - 2) hidden.push(spans[j]);
      else spans[j].className = "";
    }
    if (!hidden.length) { this.plain(); return; }
    var step = Math.min(18, TYPE_MAX_MS / hidden.length);
    for (var k = 0; k < hidden.length; k++) hidden[k].style.animationDelay = Math.round(k * step) + "ms";
    d.classList.add("is-typing");
    this.typeTimer = window.setTimeout(this.plain.bind(this), Math.round(hidden.length * step + 520));
  };

  Card.prototype.expand = function () {
    var from = this.desc.offsetHeight;
    this.stop();
    this.plain();
    this.open = true;
    this.sync();
    this.desc.classList.add("is-open");
    if (!motion.matches) this.type();
    var to = this.desc.offsetHeight;
    this.animateHeight(from, to, function () {});
  };

  Card.prototype.collapse = function () {
    var self = this;
    var from = this.desc.offsetHeight;
    this.stop();
    this.plain();
    this.open = false;
    this.sync();
    this.desc.classList.remove("is-open");
    var to = this.desc.offsetHeight;       /* height of the 2-line state */
    this.desc.classList.add("is-open");    /* stay open while the height animates down */
    this.animateHeight(from, to, function () { self.desc.classList.remove("is-open"); });
    if (motion.matches || !this.desc.animate || Math.abs(from - to) < 2) this.desc.classList.remove("is-open");
  };

  Card.prototype.toggle = function () { if (this.open) this.collapse(); else this.expand(); };

  /* only show a button where the text really is longer than 2 lines */
  Card.prototype.check = function () {
    if (this.open || this.anim) return;
    this.btn.hidden = this.desc.scrollHeight <= this.desc.clientHeight + 1;
  };

  cards.forEach(function (card) {
    if (!card.querySelector(".cert-desc") || !card.querySelector(".cert-toggle")) return;
    states.set(card, new Card(card));
  });

  path.addEventListener("click", function (event) {
    var btn = event.target.closest ? event.target.closest(".cert-toggle") : null;
    if (!btn) return;
    var st = states.get(btn.closest(".cert-card"));
    if (st) st.toggle();
  });

  /* pulse only while a card is on screen */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.classList.toggle("is-live", e.isIntersecting); });
    }, { threshold: 0.1 });
    cards.forEach(function (c) { io.observe(c); });
  } else {
    cards.forEach(function (c) { c.classList.add("is-live"); });
  }

  /* hide the button on a card whose text already fits in 2 lines (re-checked on resize, one frame at a time) */
  var checkQueued = false;
  function checkAll() {
    checkQueued = false;
    cards.forEach(function (c) { var s = states.get(c); if (s) s.check(); });
  }
  function queueCheck() { if (!checkQueued) { checkQueued = true; window.requestAnimationFrame(checkAll); } }
  window.addEventListener("resize", queueCheck, { passive: true });
  window.addEventListener("sx:viewport", queueCheck);
  /* a description can re-wrap without any window resize (panel docked, font swap): watch the 15 text blocks themselves */
  if ("ResizeObserver" in window) {
    var ro = new ResizeObserver(queueCheck);
    cards.forEach(function (c) { var d = c.querySelector(".cert-desc"); if (d) ro.observe(d); });
  }
  window.addEventListener("load", queueCheck);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueCheck);
})();
