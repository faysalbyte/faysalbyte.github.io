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
  var heroItems = heroSlide ? Array.from(heroSlide.querySelectorAll(".hero-item")) : [];
  var heroIndex = heroItems.length > 1 ? 1 : 0;
  var heroAnimating = false;

  function initializeHero() {
    if (!heroItems.length) return;
    heroItems.forEach(function (item) {
      item.classList.remove("is-active", "is-entering", "is-exiting");
      item.style.transition = "";
      item.style.transform = "";
      item.style.opacity = "";
      item.style.visibility = "";
    });
    heroItems[heroIndex].classList.add("is-active");
  }

  function moveHero(direction) {
    if (!heroSlide || heroItems.length < 2 || heroAnimating) return;
    heroAnimating = true;

    var currentItem = heroItems[heroIndex];
    var nextIndex = (heroIndex + direction + heroItems.length) % heroItems.length;
    var nextItem = heroItems[nextIndex];

    nextItem.classList.remove("is-active", "is-entering", "is-exiting");
    nextItem.style.transition = "none";
    nextItem.style.visibility = "visible";
    nextItem.style.opacity = "1";
    nextItem.style.transform = direction > 0 ? "translateX(100%)" : "translateX(-100%)";
    void nextItem.offsetWidth;
    nextItem.style.transition = "";

    currentItem.classList.remove("is-active");
    currentItem.classList.add("is-exiting");
    currentItem.style.transform = direction > 0 ? "translateX(-100%)" : "translateX(100%)";

    nextItem.classList.add("is-entering");
    nextItem.style.transform = "translateX(0)";

    window.setTimeout(function () {
      currentItem.classList.remove("is-exiting");
      currentItem.style.transition = "none";
      currentItem.style.transform = "translateX(100%)";
      currentItem.style.opacity = "0";
      currentItem.style.visibility = "hidden";

      nextItem.classList.remove("is-entering");
      nextItem.classList.add("is-active");
      nextItem.style.transition = "";
      nextItem.style.transform = "";
      nextItem.style.opacity = "";
      nextItem.style.visibility = "";

      void currentItem.offsetWidth;
      currentItem.style.transition = "";
      heroIndex = nextIndex;
      heroAnimating = false;
    }, 700);
  }

  function nextHero() {
    moveHero(1);
  }

  function prevHero() {
    moveHero(-1);
  }

  function startHeroAutoSlide() {
    clearInterval(heroTimer);
    heroTimer = null;
    if (reduceMotion.matches || !heroItems.length) return;
    heroTimer = setInterval(nextHero, 4000);
  }

  if (heroSlide && heroNext && heroPrev && heroItems.length) {
    initializeHero();
    heroNext.addEventListener("click", function () {
      nextHero();
      startHeroAutoSlide();
    });
    heroPrev.addEventListener("click", function () {
      prevHero();
      startHeroAutoSlide();
    });
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
      title: "VDP-TDP Training Certificate",
      text: "Successfully completed the Village Defence Party (VDP) and Town Defence Party (TDP) training program in Mirpur, Bangladesh. The training focused on discipline, teamwork, civic responsibility, community safety, and developing skills to support local security and community welfare.",
      image: "./personal-img/md-faysal-hossain-vdp-tdp-training-certificate.webp"
    },
    {
      title: "Ansar Training Certificate",
      text: "Successfully completed Ansar training in Mirpur, Bangladesh. The training focused on discipline, physical fitness, teamwork, leadership, security awareness, and civic responsibility to develop skills for community safety and public service.",
      image: "./personal-img/md-faysal-hossain-ansar-training-certificate.webp"
    },
    {
      title: "Fire Safety, Emergency Response and Rescue Training and Drill Completion Certificate",
      text: "Fundamentals of Fire ,Responsibility of a Fire Fighter ,Electrical and Chemical Safety Principles, Use of Personal Protective Equipment (PPE), Operate Fire Fighting Equipment & Carry Out Fire Drills, Perform First Aid and Rescue Management",
      image: "./personal-img/md-faysal-hossain-fire-safety-emergency-response-rescue-drill-training-certificate.webp"
    },
    { title: "CCTV INSTALLATION, SERVICING & MAINTENANCE",
       text: "Successfully completed training in CCTV installation, servicing, and maintenance, covering security camera installation, system configuration, cable management, troubleshooting, routine maintenance, and basic surveillance system operation.",
       image: "./personal-img/md-faysal-hossain-cctv-installation-servicing-maintenance-training-certificate.webp" },
    { title: "VDP Training- Armed",
       text: "Successfully completed armed Village Defence Party (VDP) training in Cumilla, Bangladesh. The training focused on discipline, physical fitness, teamwork, leadership, security awareness, and developing skills for community protection and public service.",
       image: "./personal-img/md-faysal-hossain-ansar-vdp-armed-training-certificate.webp" },
    { title: "LAPTOP MOTHERBOARD REPAIR & SERVICING",
       text: "Completed training in laptop motherboard repair and servicing, focusing on hardware troubleshooting, motherboard component identification, circuit diagnostics, fault detection, and repair techniques to develop practical computer hardware maintenance skills.",
       image: "./personal-img/md-faysal-hossain-laptop-motherboard-repair-servicing-training-certificate.webp" },
    { title: "Fundamental Training on Self-Defense For Youths",
       text: "Successfully completed the Fundamental Training on Self-Defense for Youths in Sylhet, Bangladesh, under the Bangladesh Krira Shikkha Protishtan (BKSP) program. The training focused on basic self-defense techniques, physical fitness, personal safety, confidence building, discipline, and situational awareness to help young people respond to potential safety threats",
       image: "./personal-img/md-faysal-hossain-self-defense-training-for-youths-certificate.webp" },
    { title: "Entrepreneurship Development Training.",
       text: "Successfully completed Entrepreneurship Development Training at the Underprivileged Children's Educational Programs (UCEP) in Mirpur, Bangladesh. The training focused on entrepreneurial skills, business planning, financial management, marketing strategies, self-employment opportunities, and business development to support future career growth and sustainable entrepreneurship.",
       image: "./personal-img/md-faysal-hossain-entrepreneurship-development-training-certificate.webp" }
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
