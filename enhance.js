(function () {
  "use strict";

  var AI_ROOT_ID = "ai-voice-assistant-root";
  var AI_IDS = [AI_ROOT_ID, "aiChat"];
  var AI_TEXT = "আপনি কি এমডি ফয়সালের কাস্টম এআই অ্যাসিস্ট্যান্টের সাথে সরাসরি কথা বলতে চান? আপনার ব্যবসার জন্য এরকম পাওয়ারফুল অটোমেটেড এআই কন্ট্রোল সিস্টেম তৈরি করতে চাইলে এখনই ফয়সালের এআই অ্যাসিস্ট্যান্টের সাথে সরাসরি চ্যাট করুন: ";
  var DISMISS_KEY = "sx-install-dismissed";
  var DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
  var toastEl = null;
  var toastTimer = 0;

  function store(op, key, value) {
    try {
      if (op === "get") return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) {
      return null;
    }
    return null;
  }

  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "sx-toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    window.clearTimeout(toastTimer);
    window.requestAnimationFrame(function () { toastEl.classList.add("is-on"); });
    toastTimer = window.setTimeout(function () { toastEl.classList.remove("is-on"); }, 2400);
  }

  function writeClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "-1000px";
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(area);
      if (ok) resolve(); else reject(new Error("copy failed"));
    });
  }

  function linkIcon() {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    var a = document.createElementNS(ns, "path");
    a.setAttribute("d", "M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.7 1.7");
    var b = document.createElementNS(ns, "path");
    b.setAttribute("d", "M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.7-1.7");
    svg.appendChild(a);
    svg.appendChild(b);
    return svg;
  }

  function sectionUrl(id) {
    return window.location.origin + window.location.pathname + "#" + id;
  }

  function makeButton(section) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "sx-copy";
    button.setAttribute("data-sx-copy", "");
    button.setAttribute("aria-label", "Copy link to this section");
    button.title = "Copy link to this section";
    button.appendChild(linkIcon());
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      var url = sectionUrl(section.id);
      var isAi = AI_IDS.indexOf(section.id) !== -1;
      var text = isAi ? AI_TEXT + url : url;
      var message = isAi ? "AI assistant invitation copied" : "Section link copied";
      writeClipboard(text).then(function () {
        button.classList.add("is-done");
        toast(message);
        window.setTimeout(function () { button.classList.remove("is-done"); }, 1600);
      }, function () {
        toast("Copy failed. Please copy the address manually.");
      });
    });
    return button;
  }

  function attach(section) {
    if (!section.id || section.querySelector(":scope > [data-sx-copy]")) return;
    if (window.getComputedStyle(section).position === "static") section.style.position = "relative";
    section.insertBefore(makeButton(section), section.firstChild);
  }

  function initCopyLinks() {
    var sections = document.querySelectorAll("section[id]");
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      if (s.id === "top" || s.classList.contains("hero")) continue;
      attach(s);
    }
    var ai = document.getElementById(AI_ROOT_ID);
    if (ai && "MutationObserver" in window) {
      var pending = 0;
      new MutationObserver(function () {
        if (pending) return;
        pending = window.requestAnimationFrame(function () {
          pending = 0;
          attach(ai);
        });
      }).observe(ai, { childList: true });
    }
  }

  function initSkeleton() {
    var root = document.getElementById(AI_ROOT_ID);
    if (!root) return;
    if (window.__sxSkeletonOwnsAI) return; /* skeleton.js runs the Section 3 loader (countdown, no 9 s give-up) */
    function rendered() {
      for (var i = 0; i < root.children.length; i++) {
        var tag = root.children[i].tagName;
        if (tag !== "NOSCRIPT" && !root.children[i].hasAttribute("data-sx-copy")) return true;
      }
      return false;
    }
    if (rendered()) return;
    root.classList.add("sx-loading");
    root.setAttribute("aria-busy", "true");
    var done = false;
    var observer = null;
    function finish() {
      done = true;
      root.classList.remove("sx-loading");
      root.removeAttribute("aria-busy");
      if (observer) observer.disconnect();
    }
    if ("MutationObserver" in window) {
      observer = new MutationObserver(function () { if (!done && rendered()) finish(); });
      observer.observe(root, { childList: true });
    }
    window.setTimeout(function () {
      if (done) return;
      finish();
      if (rendered()) return;
      root.classList.add("sx-failed");
      var p = document.createElement("p");
      p.appendChild(document.createTextNode("The live AI assistant is taking longer than usual to load. You can still reach MD Faysal Hossain through the "));
      var a = document.createElement("a");
      a.href = "contact.html";
      a.textContent = "contact page";
      p.appendChild(a);
      p.appendChild(document.createTextNode("."));
      root.appendChild(p);
    }, 9000);
  }

  function initPwa() {
    if ("serviceWorker" in navigator && window.isSecureContext) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
      });
    }

    var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
    if (standalone) return;
    var last = parseInt(store("get", DISMISS_KEY) || "0", 10);
    if (last && Date.now() - last < DISMISS_MS) return;

    var deferred = null;
    var ready = false;
    var shown = false;
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

    function show() {
      if (shown || !ready || (!deferred && !ios)) return;
      shown = true;
      var bar = document.createElement("div");
      bar.className = "sx-install";
      bar.setAttribute("role", "dialog");
      bar.setAttribute("aria-label", "Install the MD FAYSAL HOSSAIN app");
      var img = document.createElement("img");
      img.src = "icons/md-faysal-hossain-web-app-icon-192.png";
      img.alt = "";
      img.width = 40;
      img.height = 40;
      var p = document.createElement("p");
      p.textContent = deferred ? "Install MD FAYSAL HOSSAIN as an app" : "Tap Share, then Add to Home Screen";
      p.title = p.textContent;
      bar.appendChild(img);
      bar.appendChild(p);
      if (deferred) {
        var yes = document.createElement("button");
        yes.type = "button";
        yes.className = "sx-yes";
        yes.textContent = "Install";
        yes.addEventListener("click", function () {
          var evt = deferred;
          deferred = null;
          close();
          evt.prompt();
        });
        bar.appendChild(yes);
      }
      var no = document.createElement("button");
      no.type = "button";
      no.className = "sx-no";
      no.textContent = "Not now";
      no.addEventListener("click", function () {
        store("set", DISMISS_KEY, String(Date.now()));
        close();
      });
      bar.appendChild(no);
      function close() {
        bar.classList.remove("is-on");
        window.setTimeout(function () { if (bar.parentNode) bar.parentNode.removeChild(bar); }, 600);
      }
      document.body.appendChild(bar);
      window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { bar.classList.add("is-on"); }); });
    }

    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      deferred = event;
      show();
    });
    window.addEventListener("appinstalled", function () {
      deferred = null;
      var bar = document.querySelector(".sx-install");
      if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
    });
    window.setTimeout(function () { ready = true; show(); }, 3000);
  }

  /* v5: viewport emulation reflow. DevTools device emulation (and rotation / docking) can change the width
     without every layout consumer re-measuring. One ResizeObserver on <html> waits one frame plus a short
     settle, forces a single synchronous reflow, drops any stray horizontal scroll offset and, if no native
     resize event arrived, fires one synthetic "resize" so older listeners re-measure. No timers while idle. */
  function initReflow() {
    if (!("ResizeObserver" in window)) return;
    var root = document.documentElement;
    var lastW = root.clientWidth;
    var lastH = window.innerHeight;
    var frame = 0;
    var settle = 0;
    var native = false;
    var firing = false;

    function reflow() {
      frame = 0;
      var w = root.clientWidth;
      var h = window.innerHeight;
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      void root.offsetWidth;                         /* force one synchronous reflow with the new size */
      if (window.scrollX) window.scrollTo(0, window.scrollY);   /* never leave a sideways offset behind */
      if (!native && !firing) {
        firing = true;
        try { window.dispatchEvent(new Event("resize")); } catch (e) { /* optional */ }
        firing = false;
      }
    }

    function queue() {
      if (firing) return;
      if (!frame) frame = window.requestAnimationFrame(reflow);
      window.clearTimeout(settle);
      settle = window.setTimeout(function () { settle = 0; native = false; reflow(); }, 160);
    }

    window.addEventListener("resize", function () { if (!firing) { native = true; queue(); } }, { passive: true });
    try { new ResizeObserver(queue).observe(root); } catch (e) { /* optional */ }
  }

  function boot() {
    initReflow();
    initCopyLinks();
    initSkeleton();
    initPwa();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
