/*!
 * common.js - behaviour shared by every page.
 * Replaces the copies of the same code that used to live in script.js,
 * skills.js, contact.js and portfolio.js (mobile menu, footer year,
 * reduced-motion flag).
 */
(function () {
  "use strict";

  var $ = function (selector, root) { return (root || document).querySelector(selector); };
  var $$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };

  /* ---- footer year: <span id="year"> or [data-current-year] ---- */
  $$("#year, [data-current-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---- reduced motion: keeps the .reduce-motion class in sync ---- */
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var syncMotion = function () {
    document.documentElement.classList.toggle("reduce-motion", motionQuery.matches);
  };
  syncMotion();
  if (motionQuery.addEventListener) motionQuery.addEventListener("change", syncMotion);

  /* ---- mobile navigation ----
   * The page stylesheets use different hooks (.open on most pages,
   * .active on a few), so both classes are toggled. */
  (function initMenu() {
    var button = $("#menuButton");
    var menu = $("#mobileMenu");
    if (!button || !menu) return;
    var links = $$("a", menu);

    function setOpen(open, returnFocus) {
      button.classList.toggle("open", open);
      button.classList.toggle("active", open);
      menu.classList.toggle("open", open);
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
      menu.setAttribute("aria-hidden", String(!open));
      links.forEach(function (a) {
        if (open) a.removeAttribute("tabindex"); else a.setAttribute("tabindex", "-1");
      });
      if (returnFocus) button.focus();
    }

    setOpen(false);

    button.addEventListener("click", function (event) {
      event.stopPropagation();
      setOpen(button.getAttribute("aria-expanded") !== "true");
    });
    links.forEach(function (a) { a.addEventListener("click", function () { setOpen(false); }); });
    document.addEventListener("click", function (event) {
      if (!menu.contains(event.target) && !button.contains(event.target)) setOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") setOpen(false, true);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 850) setOpen(false);
    }, { passive: true });
  })();

  /* ---- "Go back" links (404 page): replaces href="javascript:history.back()" ---- */
  $$("[data-history-back]").forEach(function (el) {
    el.addEventListener("click", function (event) {
      if (window.history.length > 1) {
        event.preventDefault();
        window.history.back();
      }
    });
  });
})();
