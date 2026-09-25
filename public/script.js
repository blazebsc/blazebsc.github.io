(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // --- scroll progress + header ---
  const progress = document.getElementById("scroll-progress");
  const header = document.getElementById("header");
  const hint = document.querySelector(".scroll-hint");
  const heroInner = document.querySelector(".hero-inner");
  const parallaxEls = [...document.querySelectorAll(".section-head h2")];
  const navLinks = [...document.querySelectorAll('nav a[href^="#"]')].filter(a => a.getAttribute("href").length > 1);
  const sections = navLinks.map(a => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  let ticking = false;
  const onScroll = () => {
    const h = document.documentElement;
    const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
    if (progress) progress.style.transform = `scaleX(${p})`;
    if (header) header.classList.toggle("scrolled", h.scrollTop > 12);
    if (hint) hint.classList.toggle("gone", h.scrollTop > 140);
    if (!reduce && heroInner && h.scrollTop < innerHeight) {
      heroInner.style.transform = `translateY(${h.scrollTop * 0.18}px)`;
      heroInner.style.opacity = String(Math.max(0, 1 - h.scrollTop / (innerHeight * 0.85)));
    }
    const y = h.scrollTop + 140;
    let cur = "";
    for (const s of sections) if (s.offsetTop <= y) cur = "#" + s.id;
    if (sections.length && h.scrollTop + h.clientHeight >= h.scrollHeight - 2) cur = "#" + sections[sections.length - 1].id;
    for (const a of navLinks) a.classList.toggle("active", a.getAttribute("href") === cur);
    if (!reduce) {
      for (const el of parallaxEls) {
        const r = el.getBoundingClientRect();
        const v = (innerHeight / 2 - (r.top + r.height / 2)) * 0.04;
        el.style.transform = `translateY(${v}px)`;
      }
    }
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // --- smooth anchor scroll ---
  for (const a of document.querySelectorAll('a[href^="#"]')) {
    a.addEventListener("click", e => {
      const id = a.getAttribute("href");
      if (id.length > 1) {
        const t = document.querySelector(id);
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); }
      }
    });
  }

  if (reduce) {
    document.querySelectorAll(".reveal").forEach(el => el.classList.add("is-visible"));
    return;
  }

  // --- staggered reveal (page load + scroll) ---
  // Content stays visible by default; hiding applies only once the observer is ready.
  const reveals = [...document.querySelectorAll(".reveal")];
  if (typeof IntersectionObserver !== "undefined" && reveals.length) {
    const root = document.documentElement;
    root.classList.add("reveals-armed");
    try {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) {
          const d = parseInt(e.target.dataset.delay || "0") * 110;
          setTimeout(() => e.target.classList.add("is-visible"), d);
          io.unobserve(e.target);
        }
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
      for (const el of reveals) io.observe(el);
    } catch (e) {
      root.classList.remove("reveals-armed");
    }
  }

  // --- hero blobs parallax (pauses offscreen and when hidden) ---
  const hero = document.querySelector(".hero");
  const blobs = [...document.querySelectorAll(".hero-blob")];
  if (hero && blobs.length) {
    let btx = 0, bty = 0, bmx = 0, bmy = 0, t = 0;
    let heroVisible = true, blobRaf = 0;
    const renderBlobs = () => {
      t += 0.007;
      bmx += (btx - bmx) * 0.04; bmy += (bty - bmy) * 0.04;
      blobs.forEach((b, i) => {
        const f = (i + 1) * 22;
        const dx = bmx * f + Math.sin(t * (0.6 + i * 0.18)) * 14;
        const dy = bmy * f + Math.cos(t * (0.55 + i * 0.13)) * 12;
        const s = 1 + Math.sin(t * 0.45 + i) * 0.04;
        const r = Math.sin(t * 0.2 + i) * 2;
        b.style.transform = `translate(${dx}px,${dy}px) scale(${s}) rotate(${r}deg)`;
      });
    };
    const startBlobs = () => {
      if (blobRaf) return;
      const loop = () => { renderBlobs(); blobRaf = requestAnimationFrame(loop); };
      loop();
    };
    const stopBlobs = () => { cancelAnimationFrame(blobRaf); blobRaf = 0; };
    const updateBlobPlayback = () => {
      if (document.hidden || !heroVisible) stopBlobs();
      else startBlobs();
    };
    if (finePointer) {
      hero.addEventListener("mousemove", e => {
        const r = hero.getBoundingClientRect();
        btx = (e.clientX - r.left - r.width / 2) / r.width;
        bty = (e.clientY - r.top - r.height / 2) / r.height;
      }, { passive: true });
      hero.addEventListener("mouseleave", () => { btx = 0; bty = 0; });
    }
    startBlobs();
    if (typeof IntersectionObserver !== "undefined") {
      new IntersectionObserver((entries) => {
        heroVisible = entries[0] ? entries[0].isIntersecting : true;
        updateBlobPlayback();
      }).observe(hero);
    }
    document.addEventListener("visibilitychange", updateBlobPlayback);
  }

  // --- magnetic buttons (fine pointers only) ---
  if (finePointer) {
    for (const btn of document.querySelectorAll(".magnetic")) {
      const strength = parseFloat(btn.dataset.strength || "0.3");
      btn.addEventListener("mousemove", e => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * strength}px,${y * strength * 0.8}px)`;
      });
      btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
    }
  }

  // --- card tilt + spotlight (fine pointers only) ---
  if (finePointer) {
    for (const card of document.querySelectorAll(".stat-card, .project-card")) {
      card.addEventListener("mousemove", e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(700px) rotateY(${x * 9}deg) rotateX(${-y * 9}deg) translateY(-3px)`;
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
      card.addEventListener("mouseleave", () => { card.style.transform = ""; });
    }
  }

  // --- typewriter (static label for assistive tech, no live announcements) ---
  const sub = document.getElementById("hero-sub");
  if (sub) {
    const phrases = ["i build things", "i break things", "i ship things", "i tinker with the web"];
    let pi = 0, ci = 0, del = false, hold = 0;
    sub.setAttribute("aria-label", "I build things.");
    sub.classList.add("typing");
    sub.textContent = "";
    (function tick() {
      if (!document.hidden) {
        const cur = phrases[pi];
        if (!del) { sub.textContent = cur.slice(0, ++ci); if (ci === cur.length) { hold = 22; del = true; } }
        else { if (hold > 0) hold--; else { sub.textContent = cur.slice(0, --ci); if (ci === 0) { del = false; pi = (pi + 1) % phrases.length; } } }
      }
      setTimeout(tick, del && hold === 0 ? 38 : del ? 55 : 105);
    })();
  }

  // --- hero title mouse warp (fine pointers only) ---
  const title = document.querySelector(".hero-title");
  if (title && finePointer) {
    title.addEventListener("mousemove", e => {
      const r = title.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      title.style.setProperty("--tx", `${x * 14}px`);
    });
    title.addEventListener("mouseleave", () => title.style.setProperty("--tx", "0px"));
  }
})();
