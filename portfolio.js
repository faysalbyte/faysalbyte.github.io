/* portfolio.js - Portfolio page: video autoplay, infinite carousels, project modal.
 * Menu / year / reduced-motion logic now lives in common.js. */
(function () {
  "use strict";

  /* ---------- project videos: play only while visible / hovered ---------- */
  var videos = document.querySelectorAll(".project-video");
  var safePlay = function (video) { var p = video.play(); if (p && p.catch) p.catch(function () {}); };

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) safePlay(entry.target); else entry.target.pause();
      });
    }, { threshold: 0.15 });
    videos.forEach(function (v) { observer.observe(v); });
  }
  videos.forEach(function (video) {
    video.addEventListener("mouseenter", function () { safePlay(video); });
    video.addEventListener("mouseleave", function () {
      var card = video.closest(".card");
      if (!(card && card.matches(":hover"))) video.pause();
    });
    video.addEventListener("touchstart", function () { safePlay(video); }, { passive: true });
  });

  /* ---------- infinite carousel: duplicate the cards for the CSS marquee ---------- */
  document.querySelectorAll(".carousel-track").forEach(function (track) {
    Array.prototype.slice.call(track.children).forEach(function (card) {
      var clone = card.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.querySelectorAll("a, button").forEach(function (el) { el.setAttribute("tabindex", "-1"); });
      track.appendChild(clone);
    });
  });

  /* ---------- project modal ---------- */
  var u = function (id) {
    return "https://images.unsplash.com/" + id + "?auto=format&fit=crop&w=1200&q=85";
  };
  var projects = {
    "vanilla-01": { title: "Modern Landing Page", image: u("photo-1555066931-4365d14bab8c"), description: "A clean responsive landing page created with semantic HTML and raw CSS. The project focuses on typography, spacing, responsive behavior and modern visual details." },
    "vanilla-02": { title: "Glass Interface", image: u("photo-1547658719-da2b51169166"), description: "A lightweight interface built without external UI frameworks. The design combines responsive CSS layouts with modern visual hierarchy." },
    "vanilla-03": { title: "Portfolio UI", image: u("photo-1516321318423-f06f85e504b3"), description: "A personal portfolio interface designed around accessibility, readability, responsive layouts and reusable components." },
    "vanilla-04": { title: "Responsive Dashboard", image: u("photo-1558655146-d09347e92766"), description: "A responsive dashboard concept with reusable cards, content hierarchy and device-friendly spacing." },
    "bootstrap-01": { title: "Business Website", image: u("photo-1498050108023-c5249f4df085"), description: "A professional business website using Bootstrap's responsive grid, utilities and component system." },
    "bootstrap-02": { title: "Admin Panel", image: u("photo-1460925895917-afdab827c52f"), description: "A dashboard concept developed with Bootstrap components and a responsive grid system for different screen sizes." },
    "tailwind-01": { title: "SaaS Landing Page", image: u("photo-1551650975-87deedd944c3"), description: "A modern SaaS landing page using Tailwind utility classes to create a flexible responsive visual system." },
    "tailwind-02": { title: "Creative Agency", image: u("photo-1558655146-9f40138edfeb"), description: "A creative agency concept focused on strong visual hierarchy, responsive cards and utility-first styling." },
    "javascript-01": { title: "Interactive App", image: u("photo-1515879218367-8466d910aaa4"), description: "A native JavaScript project demonstrating DOM manipulation, user interactions and dynamic interface behavior." },
    "javascript-02": { title: "Dynamic Dashboard", image: u("photo-1516321165247-4aa89a48be28"), description: "An interactive dashboard concept using JavaScript for dynamic interface behavior and API-oriented architecture." },
    "gsap-01": { title: "Motion Experience", image: u("photo-1550745165-9bc0b252726f"), description: "A motion-focused interface combining CSS effects with GSAP-powered animation sequences." },
    "gsap-02": { title: "Animated Portfolio", image: u("photo-1558655146-364adaf1fcc9"), description: "An immersive portfolio concept featuring smooth transitions, motion choreography and responsive visual interactions." }
  };
  var FOOTER_NOTE = "This project focuses on responsive design, accessibility, readability, maintainable structure and a user-friendly experience across modern devices.";

  var modal = document.getElementById("projectModal");
  var closeBtn = document.getElementById("modalClose");
  var titleEl = document.getElementById("modalTitle");
  var bodyEl = document.getElementById("modalBody");
  var opener = null;

  function feature(text) {
    var wrap = document.createElement("div");
    wrap.className = "modal-feature";
    var p = document.createElement("p");
    p.textContent = text;
    wrap.appendChild(p);
    return wrap;
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    document.documentElement.classList.remove("modal-open");
    if (opener && typeof opener.focus === "function") opener.focus();
  }

  function openModal(button) {
    var data = projects[button.dataset.modal];
    if (!data || !modal || !titleEl || !bodyEl) return;
    opener = button;
    titleEl.textContent = data.title;
    bodyEl.textContent = "";
    var img = document.createElement("img");
    img.src = data.image;
    img.alt = data.title + " project preview";
    img.loading = "lazy";
    bodyEl.appendChild(feature(data.description));
    bodyEl.appendChild(img);
    bodyEl.appendChild(feature(FOOTER_NOTE));
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    document.documentElement.classList.add("modal-open");
    var drawer = modal.querySelector(".project-modal");
    if (drawer) drawer.scrollTop = 0;
    requestAnimationFrame(function () { if (closeBtn) closeBtn.focus(); });
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest(".details-button");
    if (button) { event.preventDefault(); openModal(button); }
  });
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", function (event) { if (event.target === modal) closeModal(); });
    modal.addEventListener("touchmove", function (event) {
      if (event.target === modal) event.preventDefault();
    }, { passive: false });
    modal.addEventListener("keydown", function (event) { // focus trap
      if (event.key !== "Tab") return;
      var f = modal.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var firstEl = f[0], lastEl = f[f.length - 1];
      if (event.shiftKey && document.activeElement === firstEl) { event.preventDefault(); lastEl.focus(); }
      else if (!event.shiftKey && document.activeElement === lastEl) { event.preventDefault(); firstEl.focus(); }
    });
  }
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal && modal.classList.contains("active")) closeModal();
  });

  /* ---------- optional GSAP intro (only if GSAP is loaded and motion is allowed) ---------- */
  if (typeof gsap !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.from(".portfolio-hero .eyebrow", { opacity: 0, y: 20, duration: 0.8, ease: "power3.out" });
    gsap.from(".portfolio-hero h1", { opacity: 0, y: 35, duration: 1, delay: 0.15, ease: "power3.out" });
    gsap.from(".portfolio-hero p", { opacity: 0, y: 25, duration: 0.8, delay: 0.3, ease: "power3.out" });
    gsap.utils.toArray(".section-heading").forEach(function (el) {
      gsap.from(el, { opacity: 0, y: 30, duration: 0.8, ease: "power3.out" });
    });
  }
})();
