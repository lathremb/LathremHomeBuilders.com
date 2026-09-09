/* =========================================================
   Lathrem Homebuilders — site behaviour
   ========================================================= */
(function () {
  "use strict";

  /* ---------- sticky header ---------- */
  var hdr = document.querySelector(".hdr");
  if (hdr && !hdr.classList.contains("hdr--solid")) {
    var onScroll = function () {
      hdr.classList.toggle("is-stuck", window.scrollY > 60);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- mobile menu ---------- */
  var burger = document.querySelector(".burger");
  var nav = document.querySelector(".nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        nav.classList.remove("is-open");
        burger.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      }
    });
  }

  /* ---------- reveal on scroll ---------- */
  var reveals = document.querySelectorAll(".rv");
  if (reveals.length) {
    if (!("IntersectionObserver" in window)) {
      reveals.forEach(function (el) { el.classList.add("is-in"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
      reveals.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---------- lightbox ---------- */
  var lb = document.querySelector(".lb");
  if (lb) {
    var lbImg = lb.querySelector(".lb__img");
    var lbCap = lb.querySelector(".lb__cap");
    var items = Array.prototype.slice.call(document.querySelectorAll("[data-lb]"));
    var idx = 0;

    var show = function (i) {
      idx = (i + items.length) % items.length;
      var el = items[idx];
      lbImg.src = el.getAttribute("data-lb");
      lbImg.alt = el.getAttribute("data-lb-cap") || "";
      lbCap.textContent = el.getAttribute("data-lb-cap") || "";
    };
    var open = function (i) {
      show(i);
      lb.classList.add("is-open");
      document.body.style.overflow = "hidden";
    };
    var close = function () {
      lb.classList.remove("is-open");
      document.body.style.overflow = "";
      lbImg.src = "";
    };

    items.forEach(function (el, i) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        open(i);
      });
    });

    lb.querySelector(".lb__x").addEventListener("click", close);
    lb.querySelector(".lb__prev").addEventListener("click", function (e) { e.stopPropagation(); show(idx - 1); });
    lb.querySelector(".lb__next").addEventListener("click", function (e) { e.stopPropagation(); show(idx + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });

    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
  }

  /* ---------- portfolio filter ---------- */
  var filterBar = document.querySelector("[data-filter-bar]");
  if (filterBar) {
    filterBar.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-filter]");
      if (!btn) return;
      var key = btn.getAttribute("data-filter");
      filterBar.querySelectorAll("[data-filter]").forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });
      document.querySelectorAll("[data-cat]").forEach(function (t) {
        var match = key === "all" || t.getAttribute("data-cat") === key;
        t.style.display = match ? "" : "none";
      });
    });
  }

  /* ---------- contact form ----------
     Posts JSON to our own serverless function at /api/contact, which sends the
     enquiry on by email. The destination address lives in a Vercel environment
     variable, so it never reaches the browser — there is nothing in the page
     source for a scraper to harvest — and the visitor doesn't need a mail
     client installed for the message to arrive. */
  var form = document.querySelector("[data-contact-form]");
  if (form) {
    var note = form.querySelector("[data-form-note]");
    var submitBtn = form.querySelector("[type=submit]");
    var btnLabel = submitBtn ? submitBtn.textContent : "";
    var loadedAt = Date.now();

    var say = function (cls, msg) {
      if (!note) return;
      note.className = cls;
      note.textContent = msg;
    };

    var PHONE_FALLBACK = " Please call (520) 975-0456 and we'll pick it up from there.";

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var payload = {};
      new FormData(form).forEach(function (v, k) { payload[k] = v; });
      payload._t = loadedAt;

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending…"; }
      say("form__note", "Sending your enquiry…");

      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            if (!res.ok) throw new Error((data && data.error) || "");
            return data;
          });
        })
        .then(function () {
          form.reset();
          loadedAt = Date.now();
          say("form__ok",
            "Thank you — your enquiry is with us. We'll be in touch within two business days. " +
            "If it's urgent, call (520) 975-0456.");
        })
        .catch(function (err) {
          var detail = err && err.message ? " " + err.message : "";
          say("form__err", "Sorry — that didn't send." + detail + PHONE_FALLBACK);
        })
        .finally(function () {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = btnLabel; }
        });
    });
  }

  /* ---------- footer year ---------- */
  var yr = document.querySelector("[data-year]");
  if (yr) yr.textContent = new Date().getFullYear();
})();
