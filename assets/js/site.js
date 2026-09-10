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

  /* ---------- reviews carousel ---------- */
  var carousel = document.querySelector("[data-carousel]");
  if (carousel) {
    var slides = Array.prototype.slice.call(carousel.querySelectorAll("[data-slide]"));
    var dotsWrap = carousel.querySelector("[data-carousel-dots]");
    var current = 0;
    var timer = null;
    var INTERVAL = 7000;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (slides.length > 1) {
      /* dots */
      var dots = slides.map(function (s, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "rev__dot" + (i === 0 ? " is-active" : "");
        b.setAttribute("aria-label", "Review " + (i + 1) + " of " + slides.length);
        b.addEventListener("click", function () { go(i); rest(); });
        dotsWrap.appendChild(b);
        return b;
      });

      var paint = function () {
        slides.forEach(function (s, i) {
          var on = i === current;
          s.classList.toggle("is-active", on);
          s.setAttribute("aria-hidden", on ? "false" : "true");
        });
        dots.forEach(function (d, i) {
          d.classList.toggle("is-active", i === current);
          d.setAttribute("aria-selected", i === current ? "true" : "false");
        });
      };
      var go = function (i) { current = (i + slides.length) % slides.length; paint(); };
      var next = function () { go(current + 1); };
      var prev = function () { go(current - 1); };

      /* auto-advance, unless the visitor prefers reduced motion */
      var start = function () {
        if (reduced || timer) return;
        timer = setInterval(next, INTERVAL);
      };
      var stop = function () { clearInterval(timer); timer = null; };
      var rest = function () { stop(); start(); };

      carousel.querySelector("[data-carousel-next]").addEventListener("click", function () { next(); rest(); });
      carousel.querySelector("[data-carousel-prev]").addEventListener("click", function () { prev(); rest(); });

      /* pause while the visitor is reading or tabbing through */
      carousel.addEventListener("mouseenter", stop);
      carousel.addEventListener("mouseleave", start);
      carousel.addEventListener("focusin", stop);
      carousel.addEventListener("focusout", start);
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) { stop(); } else { start(); }
      });

      /* keyboard, once the carousel has focus within it */
      carousel.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") { prev(); rest(); }
        if (e.key === "ArrowRight") { next(); rest(); }
      });

      /* touch swipe */
      var x0 = null, y0 = null;
      carousel.addEventListener("touchstart", function (e) {
        x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; stop();
      }, { passive: true });
      carousel.addEventListener("touchend", function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        var dy = e.changedTouches[0].clientY - y0;
        /* only act on a mostly-horizontal swipe, so vertical scrolling still works */
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) { next(); } else { prev(); }
        }
        x0 = y0 = null;
        start();
      }, { passive: true });

      paint();
      start();
    }
  }

  /* ---------- contact form ----------
     Posts JSON to our own serverless function at /api/contact, which sends the
     inquiry on by email. The destination address lives in a Vercel environment
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
      say("form__note", "Sending your inquiry…");

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
            "Thank you — your inquiry is with us. We'll be in touch within two business days. " +
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
