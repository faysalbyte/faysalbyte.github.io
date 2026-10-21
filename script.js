/* script.js - home page only: typing headline, portrait burn transition, parallax.
 * Menu / year / reduced-motion logic now lives in common.js. */
(function () {
  "use strict";

  /* ---------- typing headline ---------- */
  var typingEl = document.getElementById("typing");
  var roles = [
    "INDUSTRIAL CERTIFIED MERN STACK DEVELOPER",
    "WEB DESIGN & WEB DEVELOPMENT FOR FREELANCING TRAINER",
    "National Skills Development Authority (NSDA) Level-3 & Level-5 CERTIFIED WEB DESIGN & WEB DEVELOPER FOR FREELANCING",
    "National Skills Development Authority (NSDA) Level-4 ANDROID APP DEVELOPMENT WITH KOTLIN",
    "National Skills Development Authority (NSDA) Level-3 & Level-4 DIGITAL MARKETING FOR FREELANCING (SEO)",
    "SEO EXPERT..",
    "Full STACK WEB DEVELOPER..",
    "Frontend Developer..",
    "Backend Developer..",
    "CMS DEVELOPER..",
    "CMS EXPERT..",
    "Shopify EXPERT..",
    "eCOMMERCE DEVELOPER..",
    "WordPress DEVELOPER..",
    "Webflow DEVELOPER..",
    "Wix DEVELOPER..",
    "Squarespace DEVELOPER..",
    "Certified Software Quality Assurance National Skills Development Authority (NSDA) Level-3",
    "Certified Software Quality Assurance",
    "Knowledge UI/UX..",
    "Knowledge DevOps .."
  ];
  var colors = ["#566574", "#6b7280", "#64748b", "#5f6b78", "#6b7280", "#596572", "#5b6875", "#607080", "#65717e", "#5f6b78", "#697582", "#5e6b78", "#66727e", "#5b6875"];

  if (typingEl) {
    var roleIndex = 0, charCount = 0, deleting = false;
    (function type() {
      var text = roles[roleIndex];
      typingEl.style.color = colors[roleIndex % colors.length];
      if (deleting) {
        charCount--;
        typingEl.textContent = text.substring(0, charCount);
        if (charCount <= 0) {
          deleting = false;
          roleIndex = (roleIndex + 1) % roles.length;
          setTimeout(type, 350);
        } else {
          setTimeout(type, 35);
        }
      } else {
        charCount++;
        typingEl.textContent = text.substring(0, charCount);
        if (charCount >= text.length) {
          deleting = true;
          setTimeout(type, 1800);
        } else {
          setTimeout(type, 70);
        }
      }
    })();
  }

  /* ---------- portrait burn / image swap ---------- */
  var portrait = document.getElementById("portrait");
  if (portrait) {
    var first = portrait.querySelector(".image-first");
    var second = portrait.querySelector(".image-second");
    var particleBox = document.getElementById("particles");
    var showingSecond = false, busy = false, revertTimer = null;

    var spawnParticles = function () {
      if (!particleBox) return;
      particleBox.innerHTML = "";
      var small = window.innerWidth <= 600;
      var total = small ? 30 : 55;
      for (var i = 0; i < total; i++) {
        var p = document.createElement("span");
        var size = 5 * Math.random() + 2;
        p.className = "particle";
        p.style.width = size + "px";
        p.style.height = size + "px";
        p.style.left = 100 * Math.random() + "%";
        p.style.top = 100 * Math.random() + "%";
        p.style.setProperty("--x", (Math.random() - 0.5) * (small ? 300 : 480) + "px");
        p.style.setProperty("--y", (Math.random() - 0.5) * (small ? 400 : 620) + "px");
        p.style.animationDelay = 0.25 * Math.random() + "s";
        particleBox.appendChild(p);
      }
    };

    var burn = function (swap) {
      busy = true;
      spawnParticles();
      portrait.classList.add("burning");
      setTimeout(swap, 650);
      setTimeout(function () {
        portrait.classList.remove("burning");
        if (particleBox) particleBox.innerHTML = "";
        busy = false;
      }, 1300);
    };

    var showSecond = function () {
      if (first) first.style.opacity = "0";
      if (second) second.style.opacity = "1";
      showingSecond = true;
    };
    var showFirst = function () {
      if (second) second.style.opacity = "0";
      if (first) first.style.opacity = "1";
      showingSecond = false;
    };

    var trigger = function (event) {
      if (event) event.preventDefault();
      if (showingSecond || busy) return;
      clearTimeout(revertTimer);
      burn(showSecond);
      revertTimer = setTimeout(function () {
        if (!busy && showingSecond) burn(showFirst);
      }, 3000);
    };

    portrait.addEventListener("mouseenter", trigger);
    portrait.addEventListener("touchstart", trigger, { passive: false });
    portrait.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") trigger(event);
    });
  }

  /* ---------- pointer parallax ----------
   * Same easing as before, but the animation frame loop now stops once the
   * values settle (and restarts on the next mouse move) instead of running
   * forever. */
  var background = document.querySelector(".background");
  var scene = document.querySelector(".portrait-scene");
  if (scene && window.matchMedia("(hover:hover) and (pointer:fine)").matches) {
    var targetX = 0, targetY = 0, curX = 0, curY = 0, running = false;
    var frame = function () {
      curX += 0.04 * (targetX - curX);
      curY += 0.04 * (targetY - curY);
      if (background) background.style.transform = "translate3d(" + 0.2 * curX + "px," + 0.2 * curY + "px,0)";
      scene.style.setProperty("--move-x", 0.04 * curX + "px");
      scene.style.setProperty("--move-y", 0.04 * curY + "px");
      if (Math.abs(targetX - curX) > 0.01 || Math.abs(targetY - curY) > 0.01) {
        requestAnimationFrame(frame);
      } else {
        running = false;
      }
    };
    window.addEventListener("mousemove", function (event) {
      targetX = 20 * (event.clientX / window.innerWidth - 0.5);
      targetY = 20 * (event.clientY / window.innerHeight - 0.5);
      if (!running) {
        running = true;
        requestAnimationFrame(frame);
      }
    }, { passive: true });
  }
})();
