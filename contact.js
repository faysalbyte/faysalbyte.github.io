/* contact.js - Contact page: validation, placeholder animation, AJAX submit.
 * Menu / year / reduced-motion logic now lives in common.js. */
(function () {
  "use strict";

  var form = document.getElementById("contactForm");
  var submitButton = document.getElementById("submitButton");
  var statusEl = document.getElementById("formStatus");

  var fields = {};
  ["name", "email", "country", "message"].forEach(function (id) {
    fields[id] = { element: document.getElementById(id), error: document.getElementById(id + "Error") };
  });

  var wrapperOf = function (el) {
    return el ? el.closest(".form-row") || el.closest(".field") || el.parentElement : null;
  };

  function showError(field, message) {
    if (!field || !field.element) return;
    var wrap = wrapperOf(field.element);
    if (field.error) {
      field.error.textContent = message;
      field.element.setAttribute("aria-describedby", field.error.id);
    }
    field.element.setAttribute("aria-invalid", "true");
    if (wrap) wrap.classList.add("invalid");
  }

  function clearError(field) {
    if (!field || !field.element) return;
    var wrap = wrapperOf(field.element);
    if (field.error) field.error.textContent = "";
    field.element.removeAttribute("aria-invalid");
    if (wrap) wrap.classList.remove("invalid");
  }

  function validate(id) {
    var field = fields[id];
    if (!field || !field.element) return true;
    var value = field.element.value.trim();
    var message = "";
    if (id === "name" && value.length < 2) message = "Please enter your name.";
    else if (id === "email" && (value.length === 0 || !field.element.validity.valid)) message = "Please enter a valid email address.";
    else if (id === "country" && !value) message = "Please select your country.";
    else if (id === "message" && value.length < 10) message = "Please write at least 10 characters.";
    if (message) { showError(field, message); return false; }
    clearError(field);
    return true;
  }

  /* ---- animated placeholders (name / subject / message) ---- */
  var placeholders = [];
  function bindPlaceholder(input, label) {
    if (!input || !label) return;
    var sync = function () { label.classList.toggle("hidden", input.value.length > 0); };
    ["input", "focus", "blur", "change"].forEach(function (evt) { input.addEventListener(evt, sync); });
    placeholders.push(sync);
    sync();
  }
  bindPlaceholder(document.getElementById("name"), document.querySelector(".name-placeholder"));
  bindPlaceholder(document.getElementById("subject"), document.querySelector(".subject-placeholder"));
  bindPlaceholder(document.getElementById("message"), document.querySelector(".message-placeholder"));

  Object.keys(fields).forEach(function (id) {
    var field = fields[id];
    if (!field.element) return;
    field.element.addEventListener("blur", function () { validate(id); });
    field.element.addEventListener("input", function () { if (field.element.value.trim()) clearError(field); });
    field.element.addEventListener("change", function () { validate(id); });
  });

  /* WhatsApp field: digits, +, spaces, brackets and dashes only */
  var whatsapp = document.getElementById("whatsapp");
  if (whatsapp) {
    whatsapp.addEventListener("input", function () {
      whatsapp.value = whatsapp.value.replace(/[^\d+\s()-]/g, "");
    });
  }

  function setStatus(text, kind, role) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = kind ? "form-status " + kind : "form-status";
    if (role) statusEl.setAttribute("role", role);
  }

  function setButtonState(state) {
    if (!submitButton) return;
    submitButton.classList.toggle("loading", state === "loading");
    submitButton.classList.toggle("done", state === "done");
    if (state === "loading") {
      submitButton.setAttribute("aria-disabled", "true");
      submitButton.setAttribute("aria-label", "Sending message");
    } else if (state === "done") {
      submitButton.setAttribute("aria-disabled", "true");
      submitButton.setAttribute("aria-label", "Message sent");
    } else {
      submitButton.removeAttribute("aria-disabled");
      submitButton.setAttribute("aria-label", "Send message");
    }
  }

  if (form && submitButton) {
    form.addEventListener("submit", function (event) {
      var valid = true, firstInvalid = null;
      Object.keys(fields).forEach(function (id) {
        if (!validate(id)) {
          valid = false;
          if (!firstInvalid) firstInvalid = fields[id].element;
        }
      });
      if (!valid) {
        event.preventDefault();
        if (firstInvalid) firstInvalid.focus();
        setStatus("Please correct the highlighted fields.", "error", "alert");
        return;
      }
      if (submitButton.classList.contains("loading")) { event.preventDefault(); return; }

      // No fetch support: let the browser submit the form normally.
      if (!window.fetch || !window.FormData) {
        setButtonState("loading");
        setStatus("Sending your message...", "sending", "status");
        return;
      }

      event.preventDefault();
      setButtonState("loading");
      setStatus("Sending your message...", "sending", "status");

      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      }).then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        setButtonState("done");
        setStatus("Thank you! Your message has been sent.", "", "status");
        form.reset();
        placeholders.forEach(function (sync) { sync(); });
        setTimeout(function () { window.location.href = "thank-you"; }, 1600);
      }).catch(function () {
        setButtonState("idle");
        setStatus("Sorry, your message could not be sent. Please try again or email me directly.", "error", "alert");
      });
    });
  }
})();
