/* Bluegrass Powder Room Co. — header, mobile menu and inquiry form */
(function () {
  "use strict";

  var header = document.querySelector(".site-header");

  /* ---------- Header: transparent over the home hero, solid once scrolled ---------- */
  if (header && header.classList.contains("site-header--overlay")) {
    var pending = false;
    var updateHeader = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
      pending = false;
    };
    updateHeader();
    window.addEventListener("scroll", function () {
      if (!pending) {
        pending = true;
        window.requestAnimationFrame(updateHeader);
      }
    }, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");

  if (header && toggle && nav) {
    var label = toggle.querySelector(".menu-toggle__label");

    var setOpen = function (open) {
      header.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      if (label) label.textContent = open ? "Close" : "Menu";
    };
    var isOpen = function () { return toggle.getAttribute("aria-expanded") === "true"; };

    toggle.addEventListener("click", function () { setOpen(!isOpen()); });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener("click", function (event) {
      if (isOpen() && !header.contains(event.target)) setOpen(false);
    });

    var desktop = window.matchMedia("(min-width: 1024px)");
    var closeOnDesktop = function (event) { if (event.matches) setOpen(false); };
    if (desktop.addEventListener) desktop.addEventListener("change", closeOnDesktop);
  }

  /* ---------- Scroll reveals: each element fades up once, the first time it enters view ---------- */
  var root = document.documentElement;
  if (root.classList.contains("motion-ok") && "IntersectionObserver" in window) {
    window.siteRevealReady = true;

    // Small stagger between related items (features, rental section, detail rows)
    document.querySelectorAll("[data-reveal-group]").forEach(function (group) {
      group.querySelectorAll("[data-reveal]").forEach(function (el, i) {
        el.style.setProperty("--reveal-delay", Math.min(i, 4) * 80 + "ms");
      });
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });

    document.querySelectorAll("[data-reveal]").forEach(function (el) { observer.observe(el); });
  }

  /* ---------- Inquiry form ---------- */
  var form = document.querySelector("[data-inquiry-form]");
  if (!form) return;

  var endpoint = (form.getAttribute("data-endpoint") || "").trim();
  var status = form.querySelector(".form-status");
  var submitButton = form.querySelector("[type='submit']");
  var submitLabel = submitButton ? submitButton.textContent : "";
  var fields = form.querySelectorAll("input:not([type='checkbox']):not([name='_gotcha']), select, textarea");
  var attempted = false;

  // Event dates can't be in the past
  var dateInput = form.querySelector("input[type='date']");
  if (dateInput) {
    var today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    dateInput.min = today.toISOString().slice(0, 10);
  }

  var errorFor = function (field) {
    var v = field.validity;
    if (v.valid) return "";
    if (v.valueMissing) return field.getAttribute("data-missing") || "Fill in this field.";
    if (v.typeMismatch && field.type === "email") return "Enter an email address like name@example.com.";
    if (v.badInput) return "Enter a number.";
    if (v.rangeUnderflow) return field.type === "date" ? "Choose a date that hasn’t passed." : "Enter a number of 1 or more.";
    if (v.rangeOverflow) return "Enter a smaller number.";
    return "Check this field.";
  };

  var showError = function (field, message) {
    var error = document.getElementById(field.id + "-error");
    field.setAttribute("aria-invalid", message ? "true" : "false");
    if (error) {
      error.textContent = message;
      error.hidden = !message;
    }
  };

  var setStatus = function (type, message) {
    if (!status) return;
    status.className = "form-status" + (type === "error" ? " form-status--error" : "");
    status.textContent = message;
    status.hidden = false;
    status.focus();
  };

  fields.forEach(function (field) {
    var recheck = function () { if (attempted) showError(field, errorFor(field)); };
    field.addEventListener("blur", recheck);
    field.addEventListener("input", recheck);
    field.addEventListener("change", recheck);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    attempted = true;

    var honeypot = form.querySelector("[name='_gotcha']");
    if (honeypot && honeypot.value) return;

    var firstInvalid = null;
    fields.forEach(function (field) {
      var message = errorFor(field);
      showError(field, message);
      if (message && !firstInvalid) firstInvalid = field;
    });

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    if (!endpoint) {
      setStatus("error", "Online inquiries aren’t connected yet, so this inquiry wasn’t sent.");
      return;
    }

    var email = form.querySelector("[name='email']");
    var replyTo = email ? email.value : "";

    submitButton.disabled = true;
    submitButton.textContent = "Sending…";

    fetch(endpoint, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Request failed with status " + response.status);
        form.reset();
        attempted = false;
        setStatus("success", "Inquiry sent. We’ll reply to " + replyTo + ".");
      })
      .catch(function () {
        setStatus("error", "Your inquiry didn’t send. Check your connection and try again.");
      })
      .finally(function () {
        submitButton.disabled = false;
        submitButton.textContent = submitLabel;
      });
  });
})();
