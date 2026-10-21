/* skills.js - About/Skills page: hero carousel + co-curricular carousel.
 * Menu / year / reduced-motion logic now lives in common.js. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- hero carousel ---------- */
  var heroSlide = document.querySelector(".hero-slide");
  var heroNext = document.querySelector(".hero-next");
  var heroPrev = document.querySelector(".hero-prev");
  var heroTimer = null;

  function restartHeroAnimation() {
    heroSlide.querySelectorAll(".hero-content").forEach(function (el) {
      el.style.animation = "none";
      void el.offsetHeight; // force reflow so the CSS animation restarts
      el.style.animation = "";
    });
  }
  function nextHero() {
    var items = heroSlide.querySelectorAll(".hero-item");
    heroSlide.appendChild(items[0]);
    restartHeroAnimation();
  }
  function prevHero() {
    var items = heroSlide.querySelectorAll(".hero-item");
    heroSlide.prepend(items[items.length - 1]);
    restartHeroAnimation();
  }
  function startHeroAutoSlide() {
    clearInterval(heroTimer);
    if (reduceMotion.matches) return; // WCAG 2.2.2: no auto-moving content for reduced-motion users
    heroTimer = setInterval(nextHero, 2000);
  }
  if (heroSlide && heroNext && heroPrev) {
    heroNext.addEventListener("click", function () { nextHero(); startHeroAutoSlide(); });
    heroPrev.addEventListener("click", function () { prevHero(); startHeroAutoSlide(); });
    startHeroAutoSlide();
  }

  /* ---------- co-curricular activity carousel ---------- */
  var boxes = document.querySelectorAll(".activity-box");
  var background = document.querySelector(".activity-background");
  var titleEl = document.querySelector(".activity-title");
  var textEl = document.querySelector(".activity-text");
  var numberEl = document.querySelector(".activity-number");
  var nextBtn = document.querySelector(".activity-next");
  var prevBtn = document.querySelector(".activity-prev");
  var activityTimer = null;
  var current = 0;

  var activities = [
    {
      title: "Fire Safety, Emergency Response and Rescue Training and Drill Completion Certificate",
      text: "Fundamentals of Fire ,Responsibility of a Fire Fighter ,Electrical and Chemical Safety Principles, Use of Personal Protective Equipment (PPE), Operate Fire Fighting Equipment & Carry Out Fire Drills, Perform First Aid and Rescue Management",
      image: "./personal-img/Fire-Safety-Emergency-Response-and-Rescue-Training-and-Drill-Completion-Certificate.webp"
    },
    { title: "CCTV INSTALLATION, SERVICING & MAINTENANCE", image: "./personal-img/CCTV-INSTALLATION-SERVICING-&-MAINTENANCE.webp" },
    { title: "VDP Training- Armed", image: "./personal-img/vdp.webp" },
    { title: "LAPTOP MOTHERBOARD REPAIR & SERVICING", image: "./personal-img/LAPTOP-MOTHERBOARD-REPAIR-&-SERVICING.webp" },
    { title: "Fundamental Training on Self-Defense For Youths", image: "./personal-img/Fundamental-Training-on-Self-Defense-For-Youths.webp" },
    { title: "Entrepreneurship Development Training.", image: "./personal-img/Entrepreneurship-Development-Training.webp" }
  ];

  function updateActivity(index) {
    current = index;
    var item = activities[current];
    boxes.forEach(function (box, i) {
      var active = i === current;
      box.classList.toggle("active", active);
      box.setAttribute("aria-pressed", String(active)); // was never updated before
    });
    if (background) background.style.backgroundImage = 'url("' + item.image + '")';
    if (titleEl) titleEl.textContent = item.title;
    if (textEl) textEl.textContent = item.text || "";
    if (numberEl) numberEl.textContent = String(current + 1).padStart(2, "0");
  }
  function startActivityAutoSlide() {
    clearInterval(activityTimer);
    if (reduceMotion.matches) return;
    activityTimer = setInterval(function () {
      updateActivity((current + 1) % activities.length);
    }, 2500);
  }
  function stepActivity(delta) {
    updateActivity((current + delta + activities.length) % activities.length);
    startActivityAutoSlide();
  }

  if (boxes.length) {
    boxes.forEach(function (box, i) {
      box.addEventListener("click", function () { updateActivity(i); startActivityAutoSlide(); });
    });
    if (nextBtn) nextBtn.addEventListener("click", function () { stepActivity(1); });
    if (prevBtn) prevBtn.addEventListener("click", function () { stepActivity(-1); });
    updateActivity(0);
    startActivityAutoSlide();
  }

  /* pause timers while the tab is hidden; only restart what exists */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      clearInterval(heroTimer);
      clearInterval(activityTimer);
    } else {
      if (heroSlide && heroNext && heroPrev) startHeroAutoSlide();
      if (boxes.length) startActivityAutoSlide();
    }
  });
})();
