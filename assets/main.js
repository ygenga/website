(function () {
  "use strict";
  var root = document.documentElement;

  // Local times in the footer
  var clocks = document.querySelectorAll("[data-clock]");
  function tick() {
    clocks.forEach(function (el) {
      try {
        el.textContent = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: el.dataset.clock }).format(new Date());
      } catch (e) {}
    });
  }
  tick(); setInterval(tick, 30000);

  // Buttons swap their label on hover; the copy comes from the visible span
  document.querySelectorAll(".btn").forEach(function (b) {
    var s = b.querySelector("span");
    if (s) b.dataset.label = s.textContent;
  });

  // Timeline: gridline length and hover/focus tooltip (works with or without motion)
  var tlChart = document.querySelector(".tl-chart");
  if (tlChart) {
    var tlRows = tlChart.querySelector(".tl-rows");
    var tlTip = tlChart.querySelector(".tl-tip");
    var setGrid = function () { tlChart.style.setProperty("--grid-h", tlRows.offsetHeight + 14 + "px"); };
    setGrid(); window.addEventListener("resize", setGrid);
    var showTip = function (bar) {
      var row = bar.closest(".tl-row");
      var name = row.querySelector(".tl-label strong").textContent;
      tlTip.innerHTML = "";
      var strong = document.createElement("strong"); strong.textContent = name;
      tlTip.appendChild(strong); tlTip.appendChild(document.createTextNode(bar.dataset.tip));
      var c = tlChart.getBoundingClientRect(), r = bar.getBoundingClientRect();
      var x = Math.min(Math.max(r.left + r.width / 2 - c.left, 120), c.width - 120);
      tlTip.style.left = x + "px"; tlTip.style.top = r.top - c.top + "px";
      tlTip.classList.add("is-on");
    };
    var hideTip = function () { tlTip.classList.remove("is-on"); };
    tlChart.querySelectorAll(".tl-bar").forEach(function (bar) {
      bar.addEventListener("pointerenter", function () { showTip(bar); });
      bar.addEventListener("pointerleave", hideTip);
      bar.addEventListener("focus", function () { showTip(bar); });
      bar.addEventListener("blur", hideTip);
    });
  }

  var motion = root.classList.contains("motion");
  if (!motion || !window.gsap || !window.ScrollTrigger || !window.SplitText) {
    root.classList.remove("motion", "intro");
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);
  var EASE = "expo.out";

  // Smooth scrolling, driven by GSAP's ticker so ScrollTrigger stays in sync
  var lenis = window.Lenis ? new Lenis({ lerp: 0.1, wheelMultiplier: 1 }) : null;
  if (lenis) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      var target = id.length > 1 && document.querySelector(id);
      if (!target || !lenis) return;
      e.preventDefault();
      lenis.scrollTo(id === "#main" ? 0 : target, { offset: -8, duration: 1.6, easing: function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; } });
    });
  });

  // Header hides while reading down, returns on the way up
  var top = document.querySelector("[data-top]");
  var lastY = 0;
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: function (self) {
      var y = self.scroll();
      top.classList.toggle("is-hidden", y > 240 && y > lastY);
      lastY = y;
    }
  });

  // Greeting next to the surname cycles through my languages
  var greet = document.getElementById("greet");
  var words = [["Hey", "en"], ["你好", "zh"], ["Hola", "es"], ["Olá", "pt"], ["Hallo", "de"]];
  var gi = 0;
  setInterval(function () {
    greet.classList.add("out");
    setTimeout(function () {
      gi = (gi + 1) % words.length;
      greet.textContent = words[gi][0];
      greet.lang = words[gi][1];
      greet.classList.remove("out");
    }, 280);
  }, 2200);

  var mm = gsap.matchMedia();
  var globeProgress = 0;

  // ---------- 3D globe: load the React Three Fiber bundle only when the Path section is near ----------
  function webgl() {
    try { var c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; }
  }
  var globeEl = document.querySelector(".path-globe");
  if (globeEl && webgl() && "IntersectionObserver" in window) {
    var gio = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      gio.disconnect();
      var sc = document.createElement("script");
      sc.src = "assets/globe/globe.js";
      sc.onload = function () {
        if (!window.mountGlobe) return;
        window.mountGlobe(globeEl, function () { return globeProgress; }, false);
        setTimeout(function () { globeEl.classList.add("is-ready"); }, 300);
      };
      document.body.appendChild(sc);
    }, { rootMargin: "1200px 0px" });
    gio.observe(globeEl);
  }

  (document.fonts ? document.fonts.ready : Promise.resolve()).then(init);

  function init() {
    // ---------- Intro + hero entrance ----------
    var heroChars = [];
    document.querySelectorAll(".hero .split-chars").forEach(function (el) {
      heroChars = heroChars.concat(SplitText.create(el, { type: "chars", charsClass: "char" }).chars);
    });
    gsap.set(".hero .split-chars", { visibility: "visible" });
    gsap.set(heroChars, { yPercent: 110 });

    var ledeSplit = SplitText.create(".hero .lede", { type: "lines", mask: "lines" });
    gsap.set(".hero .lede", { visibility: "visible" });
    gsap.set(ledeSplit.lines, { yPercent: 100 });
    gsap.set([".hero-meta p", ".hero .hero-links", ".scroll-cue"], { autoAlpha: 0, y: 16 });

    var hero = gsap.timeline({ paused: true });
    hero.to(heroChars, { yPercent: 0, duration: 1.3, ease: EASE, stagger: 0.04 }, 0)
      .to(".portrait-frame", { clipPath: "inset(0% 0 0 0)", duration: 1.4, ease: "expo.inOut" }, 0.1)
      .from(".portrait-frame img", { scale: 1.35, duration: 1.8, ease: EASE }, 0.1)
      .to(ledeSplit.lines, { yPercent: 0, duration: 1.1, ease: EASE, stagger: 0.08 }, 0.5)
      .to([".hero-meta p", ".hero .hero-links", ".scroll-cue"], { autoAlpha: 1, y: 0, duration: 0.9, ease: EASE, stagger: 0.06 }, 0.7);

    if (root.classList.contains("intro")) {
      try { sessionStorage.setItem("introSeen", "1"); } catch (e) {}
      if (lenis) lenis.stop();
      var intro = gsap.timeline({
        onComplete: function () { root.classList.remove("intro"); if (lenis) lenis.start(); }
      });
      var count = { v: 0 };
      var num = document.querySelector(".loader-num");
      intro.to(count, { v: 100, duration: 1.5, ease: "power2.inOut", onUpdate: function () { num.textContent = String(Math.round(count.v)).padStart(2, "0"); } }, 0);
      document.querySelectorAll(".loader-words span").forEach(function (w, i) {
        intro.fromTo(w, { autoAlpha: 0, yPercent: 50 }, { autoAlpha: 1, yPercent: 0, duration: 0.16, ease: "power3.out" }, i * 0.29)
          .to(w, { autoAlpha: 0, yPercent: -50, duration: 0.1, ease: "power2.in" }, i * 0.29 + 0.19);
      });
      intro.to(".loader", { clipPath: "inset(0 0 100% 0)", duration: 0.9, ease: "expo.inOut" }, 1.45)
        .add(function () { hero.play(); }, 1.75);
    } else {
      hero.play();
    }

    // Hero drifts apart as you leave it
    mm.add("(min-width: 861px)", function () {
      var tl = gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
      tl.to(".hero-line:first-child", { xPercent: -6, ease: "none" }, 0)
        .to(".hero-line--2", { xPercent: 10, ease: "none" }, 0)
        .to(".portrait-frame img", { yPercent: 12, scale: 1.08, ease: "none" }, 0)
        .to(".hero-copy", { y: -60, ease: "none" }, 0);
    });

    // ---------- Marquee that reacts to scroll speed and direction ----------
    var track = document.querySelector(".marquee-track");
    var loop = gsap.to(track, { xPercent: -50, duration: 28, ease: "none", repeat: -1 });
    var dir = 1;
    ScrollTrigger.create({
      trigger: ".marquee", start: "top bottom", end: "bottom top",
      onUpdate: function (self) {
        var v = self.getVelocity();
        dir = self.direction;
        gsap.to(loop, { timeScale: dir * (1 + Math.min(Math.abs(v) / 250, 6)), duration: 0.2, overwrite: true });
        gsap.to(loop, { timeScale: dir, duration: 1.2, delay: 0.2, ease: "power2.out" });
        gsap.to(track, { skewX: gsap.utils.clamp(-8, 8, -v / 300), duration: 0.3, overwrite: "auto" });
        gsap.to(track, { skewX: 0, duration: 0.8, delay: 0.3 });
      }
    });

    // ---------- Line-by-line reveals ----------
    document.querySelectorAll("main .reveal-lines").forEach(function (el) {
      if (el.closest(".hero")) return;
      SplitText.create(el, {
        type: "lines", mask: "lines", autoSplit: true,
        onSplit: function (self) {
          gsap.set(el, { visibility: "visible" });
          return gsap.from(self.lines, { yPercent: 100, duration: 1.1, ease: EASE, stagger: 0.08, scrollTrigger: { trigger: el, start: "top 85%", once: true } });
        }
      });
    });
    gsap.utils.toArray("main .reveal-up").forEach(function (el) {
      if (el.closest(".hero")) return;
      gsap.from(el, { y: 32, autoAlpha: 0, duration: 1, ease: EASE, scrollTrigger: { trigger: el, start: "top 88%", once: true } });
    });

    // ---------- Words light up as you read (scrubbed) ----------
    document.querySelectorAll("[data-scrub-words]").forEach(function (el) {
      var split = SplitText.create(el, { type: "words", wordsClass: "word" });
      gsap.fromTo(split.words, { opacity: 0.12 }, {
        opacity: 1, ease: "none", stagger: 0.1,
        scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 42%", scrub: true }
      });
    });

    // ---------- Why me: counter rolls with the active item ----------
    mm.add("(min-width: 861px)", function () {
      var roll = document.querySelector(".why-counter-roll");
      var items = gsap.utils.toArray(".four-item");
      gsap.set(items, { opacity: 0.22 });
      items.forEach(function (item, i) {
        ScrollTrigger.create({
          trigger: item, start: "top 55%", end: "bottom 55%",
          onToggle: function (self) {
            gsap.to(item, { opacity: self.isActive ? 1 : 0.22, duration: 0.5, ease: "power2.out" });
            if (self.isActive) gsap.to(roll, { yPercent: -100 / items.length * i, duration: 0.8, ease: EASE });
          }
        });
      });
    });
    gsap.utils.toArray(".four-item").forEach(function (item) {
      gsap.from(item.querySelectorAll("h3, p, .proof li"), { y: 28, autoAlpha: 0, duration: 1, ease: EASE, stagger: 0.07, scrollTrigger: { trigger: item, start: "top 75%", once: true } });
    });
    document.querySelectorAll("[data-count]").forEach(function (el) {
      var o = { v: 0 }, n = +el.dataset.count, pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
      gsap.to(o, { v: n, duration: 1.6, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%", once: true },
        onUpdate: function () { el.textContent = pre + Math.round(o.v) + suf; } });
    });

    // ---------- 吃了吗 ----------
    gsap.from(".app-char", { yPercent: 60, autoAlpha: 0, rotate: 6, duration: 1.3, ease: EASE, stagger: 0.09, scrollTrigger: { trigger: ".app-name", start: "top 85%", once: true } });
    gsap.from(".pinyin", { autoAlpha: 0, letterSpacing: "0.4em", duration: 1.4, ease: EASE, scrollTrigger: { trigger: ".pinyin", start: "top 88%", once: true } });
    gsap.fromTo(".app-watermark", { yPercent: -12 }, { yPercent: 14, ease: "none", scrollTrigger: { trigger: ".app", start: "top bottom", end: "bottom top", scrub: true } });
    gsap.from(".facts li", { y: 28, autoAlpha: 0, duration: 1, ease: EASE, stagger: 0.1, scrollTrigger: { trigger: ".facts", start: "top 85%", once: true } });
    var photo = gsap.timeline({ scrollTrigger: { trigger: ".app-visual", start: "top bottom", end: "center 55%", scrub: true } });
    photo.fromTo(".app-photo", { clipPath: "inset(16% 14% 16% 14% round 22px)" }, { clipPath: "inset(0% 0% 0% 0% round 22px)", ease: "none" }, 0)
      .fromTo(".app-photo img", { scale: 1.4 }, { scale: 1, ease: "none" }, 0);
    // The seal lands like a stamp: big, fast, a slight overshoot
    gsap.fromTo(".seal", { scale: 2.6, autoAlpha: 0, rotate: -24 }, {
      scale: 1, autoAlpha: 1, rotate: 6, duration: 0.55, ease: "back.out(2.4)",
      scrollTrigger: { trigger: ".app-visual", start: "top 45%", once: true },
      onComplete: function () { gsap.fromTo(".app-photo", { x: -3 }, { x: 0, duration: 0.4, ease: "elastic.out(1, 0.3)" }); }
    });

    // ---------- Path: horizontal travel through the four cities ----------
    mm.add("(min-width: 861px)", function () {
      var section = document.querySelector(".path");
      var trackEl = document.querySelector(".path-track");
      var bar = document.querySelector(".path-progress span");
      section.classList.add("is-horizontal");
      var dist = function () { return Math.max(0, trackEl.scrollWidth - window.innerWidth); };
      var travel = gsap.to(trackEl, {
        x: function () { return -dist(); }, ease: "none",
        scrollTrigger: {
          trigger: section, start: "top top", end: function () { return "+=" + dist(); },
          pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (self) { gsap.set(bar, { scaleX: self.progress }); globeProgress = self.progress; }
        }
      });
      gsap.utils.toArray(".city").forEach(function (city) {
        gsap.fromTo(city.querySelector(".city-name"), { xPercent: 18 }, {
          xPercent: -6, ease: "none",
          scrollTrigger: { trigger: city, containerAnimation: travel, start: "left right", end: "right left", scrub: true }
        });
        gsap.from(city.querySelectorAll(".city-line, .roles > div"), {
          y: 24, autoAlpha: 0, duration: 0.9, ease: EASE, stagger: 0.06,
          scrollTrigger: { trigger: city, containerAnimation: travel, start: "left 75%", once: true }
        });
      });
      return function () { section.classList.remove("is-horizontal"); };
    });
    mm.add("(max-width: 860px)", function () {
      ScrollTrigger.create({ trigger: ".path-track", start: "top 60%", end: "bottom 60%", onUpdate: function (self) { globeProgress = self.progress; } });
      gsap.utils.toArray(".city").forEach(function (city) {
        gsap.from(city.children, { y: 28, autoAlpha: 0, duration: 1, ease: EASE, stagger: 0.06, scrollTrigger: { trigger: city, start: "top 82%", once: true } });
      });
    });

    // ---------- Paper wash into 吃了吗 (created after the pin so positions include its spacer) ----------
    var base = getComputedStyle(root).getPropertyValue("--bg").trim() || "#f2f4f7";
    function paint(bg) { gsap.to(document.body, { backgroundColor: bg, duration: 0.9, ease: "power2.out", overwrite: "auto" }); }
    ScrollTrigger.create({
      trigger: ".app", start: "top 70%", end: "bottom top",
      onEnter: function () { paint("#F8F5EF"); }, onEnterBack: function () { paint("#F8F5EF"); },
      onLeave: function () { paint(base); }, onLeaveBack: function () { paint(base); }
    });

    // ---------- Path panel slides up over the app with rounded corners ----------
    gsap.fromTo(".path", { clipPath: "inset(0% 3% 0% 3% round 48px 48px 0px 0px)" }, {
      clipPath: "inset(0% 0% 0% 0% round 0px 0px 0px 0px)", ease: "none",
      scrollTrigger: { trigger: ".path", start: "top bottom", end: "top top", scrub: true }
    });

    // ---------- Timeline bars and mini charts grow from their baseline ----------
    gsap.from(".tl-bar", { scaleX: 0, duration: 1.2, ease: EASE, stagger: 0.09, scrollTrigger: { trigger: ".tl-chart", start: "top 75%", once: true } });
    gsap.from(".tl-now", { autoAlpha: 0, y: -12, duration: 0.8, ease: EASE, delay: 0.9, scrollTrigger: { trigger: ".tl-chart", start: "top 75%", once: true } });
    gsap.from(".tl-row", { autoAlpha: 0, y: 14, duration: 0.8, ease: EASE, stagger: 0.05, scrollTrigger: { trigger: ".tl-chart", start: "top 80%", once: true } });
    gsap.utils.toArray(".mini").forEach(function (m) {
      gsap.from(m.querySelectorAll(".mini-bar"), { scaleX: 0, duration: 1.1, ease: EASE, stagger: 0.15, scrollTrigger: { trigger: m, start: "top 85%", once: true } });
    });

    // ---------- Rows draw in ----------
    gsap.utils.toArray(".rows").forEach(function (list) {
      gsap.from(list.children, { y: 20, autoAlpha: 0, duration: 0.9, ease: EASE, stagger: 0.06, scrollTrigger: { trigger: list, start: "top 85%", once: true } });
    });

    // ---------- Contact ----------
    var contact = SplitText.create(".contact-title .split-chars", { type: "chars", charsClass: "char" });
    gsap.set(".contact-title .split-chars", { visibility: "visible" });
    gsap.from(contact.chars, { yPercent: 110, duration: 1.2, ease: EASE, stagger: 0.035, scrollTrigger: { trigger: ".contact-title", start: "top 85%", once: true } });

    // ---------- Magnetic buttons (fine pointers only) ----------
    mm.add("(hover: hover) and (pointer: fine)", function () {
      document.querySelectorAll("[data-magnetic]").forEach(function (el) {
        var xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
        var yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
        el.addEventListener("mousemove", function (e) {
          var r = el.getBoundingClientRect();
          xTo((e.clientX - r.left - r.width / 2) * 0.3);
          yTo((e.clientY - r.top - r.height / 2) * 0.4);
        });
        el.addEventListener("mouseleave", function () { xTo(0); yTo(0); });
      });
    });

    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }
})();
