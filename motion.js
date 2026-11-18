/* The Board Game Café — motion layer.
 *
 * Libraries (self-hosted in assets/vendor, because the site's
 * Content-Security-Policy only allows same-origin scripts):
 *   GSAP + SplitText — gsap.com, standard "no charge" licence
 *   Lenis — github.com/darkroomengineering/lenis, MIT
 * The split headline, scroll-velocity strip, spotlight and tilted cards, magnet
 * buttons, click sparks, shimmer text and count-up follow effects from React
 * Bits (reactbits.dev). They are rebuilt here in plain JavaScript because the
 * site does not use React.
 *
 * Rules this file keeps:
 * - Content is visible unless this script is running, and everything it hides
 *   has a fallback that shows it again (watchdog, keyboard focus, print, errors).
 * - prefers-reduced-motion switches the whole layer off.
 * - Forms and the booking planner are never hidden or moved.
 * - Styles are only set through element.style, which the strict style-src on
 *   some pages allows. No style attributes and no <style> tags.
 * - Nothing here writes the scroll position on touch screens. Reveals use
 *   IntersectionObserver rather than GSAP's ScrollTrigger, because ScrollTrigger
 *   resets the scroll position when it refreshes and that cuts short the
 *   site's native smooth jumps to #book and other in-page links on phones.
 */
(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const gsap = window.gsap;
  const SplitText = window.SplitText;
  const Lenis = window.Lenis;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const compact = window.matchMedia("(max-width: 760px)");

  // motion.css holds the hero text back until this class is on <html>.
  const releaseHero = () => root.classList.add("mo-intro");

  if (!gsap || !("IntersectionObserver" in window) || reduceMotion.matches) {
    releaseHero();
    return;
  }

  if (SplitText) gsap.registerPlugin(SplitText);

  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const inDomOrder = (a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);

  const cleanups = [];
  let active = true;
  let lenis = null;

  /* ------------------------------------------------------------------
   * Scroll reveals
   * Each hidden element is registered with the function that shows it.
   * ------------------------------------------------------------------ */
  const pending = new Map();

  // Reveal: an element shows once its top edge is a little way up the screen
  // (higher on phones, where the tab bar covers the bottom edge).
  const revealer = new IntersectionObserver(entries => {
    const arriving = [];
    entries.forEach(entry => {
      if (!entry.isIntersecting || !pending.has(entry.target)) return;
      // Coming back up the page: no need to animate what is entering from the top.
      if (entry.boundingClientRect.top < 0) reveal(entry.target, true);
      else arriving.push(entry.target);
    });
    arriving.sort(inDomOrder).forEach((element, index) => reveal(element, false, Math.min(index * 0.07, 0.56)));
  }, { rootMargin: compact.matches ? "0px 0px -14% 0px" : "0px 0px -13% 0px" });

  // Backstop: anything still hidden after sitting on screen for a moment is
  // shown, e.g. the last items of a page that cannot scroll any further.
  const watchdog = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const element = entry.target;
      if (!entry.isIntersecting || !pending.has(element)) return;
      window.setTimeout(() => {
        const box = element.getBoundingClientRect();
        if (box.bottom > 0 && box.top < window.innerHeight) reveal(element);
      }, 700);
    });
  });

  function register(element, show) {
    pending.set(element, show);
    element.setAttribute("data-mo", "");
    revealer.observe(element);
    watchdog.observe(element);
  }

  function reveal(element, immediate = false, delay = 0) {
    const show = pending.get(element);
    if (!show) return;
    pending.delete(element);
    revealer.unobserve(element);
    watchdog.unobserve(element);
    try {
      show(immediate, delay);
    } catch (_) {
      settle(element);
    }
  }

  function revealAll(immediate) {
    Array.from(pending.keys()).forEach(element => reveal(element, immediate));
  }

  // Leave the element exactly as the stylesheets describe it.
  function settle(element) {
    gsap.killTweensOf(element);
    gsap.set(element, { clearProps: "opacity,transform,clipPath" });
    element.classList.remove("mo-anim");
    element.removeAttribute("data-mo");
  }

  function fadeUp(element, options = {}) {
    const from = { opacity: 0, x: options.x || 0, y: options.x ? 0 : (compact.matches ? 18 : 28) };
    gsap.set(element, from);
    register(element, (immediate, delay) => {
      if (immediate) { settle(element); return; }
      element.classList.add("mo-anim");
      gsap.to(element, {
        opacity: 1, x: 0, y: 0,
        duration: options.duration || 0.8,
        delay,
        ease: "power3.out",
        overwrite: true,
        onComplete: () => settle(element)
      });
      if (options.then) options.then(element, delay);
    });
  }

  // Photos on their own: open out from a slightly cropped, zoomed frame.
  function unveil(element) {
    const radius = window.getComputedStyle(element).borderTopLeftRadius || "0px";
    gsap.set(element, { opacity: 0, scale: 1.06, clipPath: `inset(10% 8% 10% 8% round ${radius})` });
    register(element, (immediate, delay) => {
      if (immediate) { settle(element); return; }
      element.classList.add("mo-anim");
      gsap.to(element, {
        opacity: 1, scale: 1, clipPath: `inset(0% 0% 0% 0% round ${radius})`,
        duration: 1.15,
        delay,
        ease: "power3.out",
        overwrite: true,
        onComplete: () => settle(element)
      });
    });
  }

  // Split a heading into lines or words only when that leaves its box exactly
  // as it was. A tightly fitting heading can wrap differently once split, and
  // SplitText treats a <br> that the stylesheet hides as a real break; either
  // would make the page jump, so those headings get a plain fade instead.
  function splitSafely(heading, options) {
    if (!SplitText || heading.querySelector("a, button, input")) return null;
    const before = heading.getBoundingClientRect();
    const split = SplitText.create(heading, { linesClass: "mo-line", aria: "none", ...options });
    const after = heading.getBoundingClientRect();
    if (Math.abs(after.height - before.height) > 0.5 || Math.abs(after.width - before.width) > 0.5) {
      split.revert();
      return null;
    }
    return split;
  }

  // Section headings: each line slides up from behind a mask, then the
  // heading's original markup is put back.
  function headline(heading) {
    gsap.set(heading, { opacity: 0 });
    register(heading, (immediate, delay) => {
      if (immediate) { settle(heading); return; }
      const split = splitSafely(heading, { type: "lines", mask: "lines" });
      if (!split) {
        gsap.fromTo(heading, { opacity: 0, y: 18 }, {
          opacity: 1, y: 0, duration: 0.8, delay, ease: "power3.out", onComplete: () => settle(heading)
        });
        return;
      }
      gsap.set(split.lines, { yPercent: 140 });
      gsap.set(heading, { opacity: 1 });
      gsap.to(split.lines, {
        yPercent: 0,
        duration: 0.95,
        delay,
        ease: "power4.out",
        stagger: 0.09,
        onComplete: () => { split.revert(); settle(heading); }
      });
      cleanups.push(() => { if (split.isSplit) split.revert(); });
    });
  }

  // Line icons draw themselves in.
  function drawIcon(svg, delay) {
    if (!svg) return;
    qsa("path, rect, circle, line, polyline, polygon, ellipse", svg).forEach(shape => {
      let length = 0;
      try { length = shape.getTotalLength(); } catch (_) { return; }
      if (!length) return;
      gsap.fromTo(shape,
        { strokeDasharray: length, strokeDashoffset: length },
        { strokeDashoffset: 0, duration: 1.1, delay: delay + 0.2, ease: "power2.inOut", clearProps: "strokeDasharray,strokeDashoffset" });
    });
  }

  // Photo cards: the picture eases back from a slight zoom as the card arrives.
  function settlePhoto(card, delay) {
    const image = card.querySelector("img");
    if (!image) return;
    image.classList.add("mo-anim");
    gsap.fromTo(image, { scale: 1.2 }, {
      scale: 1, duration: 1.5, delay, ease: "power2.out",
      onComplete: () => { gsap.set(image, { clearProps: "transform" }); image.classList.remove("mo-anim"); }
    });
  }

  // Never touched: forms, the booking planner, legal text, the menu catalogue,
  // hidden panels, the hero (it has its own intro) and FAQ answers.
  const SKIP = "form, .form-card, .legal-panel, .catalogue, [hidden], .hero, .mo-marquee, details > :not(summary)";
  // Headings inside these stay as they are; the block around them moves instead.
  const HEADLINE_SKIP = SKIP + ", .hours, .footer-cta, .contact-card, .leaderboard-grid, .leaderboard-card, .game-card, .session-calendar, .open-games-panel, .cafe-review-card";

  const CARDS = [
    ".trust-item", ".how-inline > *", ".commercial-benefit", ".use-case", ".journey-step",
    ".faq-list > details", ".hours", ".footer-cta", ".contact-card",
    ".cafe-rating", ".cafe-review-cards", ".review-links", ".sports-license-media",
    ".section-head > p", ".visit-intro-copy > p", ".about-split > div > p", ".about-split > div > .actions",
    ".booking-copy > :not(h1):not(h2):not(.eyebrow)"
  ].join(", ");
  const ICON_CARDS = ".experience-item";
  const PHOTO_CARDS = ".group-photo, .gallery-card";
  const PHOTOS = ".about-split > img, .page-photo-strip img";

  function belowFold(element) {
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && box.top > window.innerHeight * 0.92;
  }

  function setUpReveals() {
    const main = document.querySelector("main");
    if (!main) return;
    const free = element => !pending.has(element)
      && !(element.parentElement && element.parentElement.closest("[data-mo]"))
      && belowFold(element);

    qsa(CARDS, main).forEach(element => { if (!element.closest(SKIP) && free(element)) fadeUp(element); });
    qsa(ICON_CARDS, main).forEach(element => {
      if (element.closest(SKIP) || !free(element)) return;
      fadeUp(element, { then: (card, delay) => drawIcon(card.querySelector(".experience-icon svg"), delay) });
    });
    qsa(PHOTO_CARDS, main).forEach(element => {
      if (!element.closest(SKIP) && free(element)) fadeUp(element, { duration: 0.9, then: settlePhoto });
    });
    qsa(PHOTOS, main).forEach(element => { if (!element.closest(SKIP) && free(element)) unveil(element); });

    qsa("h2", main).forEach(heading => {
      if (heading.closest(HEADLINE_SKIP) || heading.querySelector("a, button, input") || !free(heading)) return;
      const eyebrow = heading.previousElementSibling;
      if (eyebrow && eyebrow.matches(".eyebrow") && free(eyebrow)) fadeUp(eyebrow, { x: -14, duration: 0.6 });
      headline(heading);
    });

    if (!pending.size) return;

    // Keyboard users: tabbing to something not yet revealed shows it at once.
    const onFocus = event => {
      const hidden = event.target.closest && event.target.closest("[data-mo]");
      if (hidden) reveal(hidden, true);
    };
    document.addEventListener("focusin", onFocus);
    const onPrint = () => revealAll(true);
    window.addEventListener("beforeprint", onPrint);
    cleanups.push(() => {
      document.removeEventListener("focusin", onFocus);
      window.removeEventListener("beforeprint", onPrint);
      revealer.disconnect();
      watchdog.disconnect();
    });
  }

  /* ------------------------------------------------------------------
   * Hero intro (every page with a .hero)
   * ------------------------------------------------------------------ */
  function fontsReady(limit) {
    if (!document.fonts || document.fonts.status === "loaded") return Promise.resolve();
    return Promise.race([
      document.fonts.ready,
      new Promise(resolve => window.setTimeout(resolve, limit))
    ]);
  }

  function shimmer(heading) {
    qsa(".brand-emphasis, .neon", heading).forEach(element => element.classList.add("mo-shiny"));
  }

  function setUpHero() {
    const hero = document.querySelector("main .hero");
    const heading = hero && hero.querySelector("h1");
    if (!heading) { releaseHero(); return; }

    const background = hero.querySelector(".hero-premium-bg img");
    const copy = hero.querySelector(".hero-premium-copy");
    // Desktop only, and only with Lenis: it moves with the smoothed scroll, so
    // nothing here runs on touch screens.
    const parallax = () => {
      if (!active || !background) return;
      heroParallax = { hero, background, copy };
      if (lenis) applyParallax(lenis.scroll);
    };

    // Take over only while the CSS hold still has the text hidden and the hero
    // is on screen; otherwise leave the page alone so nothing flashes.
    const held = () => parseFloat(window.getComputedStyle(heading).opacity) < 0.05;
    const onScreen = () => hero.getBoundingClientRect().bottom > 120;
    const standDown = () => { releaseHero(); shimmer(heading); parallax(); };
    if (!held() || !onScreen()) { standDown(); return; }

    fontsReady(350).then(() => {
      if (!active) return;
      if (!held() || !onScreen()) { standDown(); return; }
      const siblings = Array.from(heading.parentElement.children);
      const position = siblings.indexOf(heading);
      // Form fields in a hero (the offers sign-up choices) are left alone.
      const isForm = element => element.matches("form, fieldset") || !!element.querySelector("input, select, textarea");
      const before = siblings.slice(0, position).filter(element => !isForm(element));
      const after = siblings.slice(position + 1).filter(element => !isForm(element));

      const split = splitSafely(heading, { type: "lines,words", mask: "lines", wordsClass: "mo-word", ignore: ".sr-only" });
      if (split) gsap.set(split.words, { yPercent: 145 });
      else gsap.set(heading, { opacity: 0, y: 24 });
      gsap.set(before, { opacity: 0, x: -14 });
      gsap.set(after, { opacity: 0, y: 22 });
      if (background) gsap.set(background, { scale: 1.1 });
      releaseHero(); // the inline start values above now stand in for the CSS hold

      const finish = () => {
        if (split && split.isSplit) split.revert();
        gsap.set([heading, ...before, ...after], { clearProps: "opacity,transform" });
        shimmer(heading);
        parallax();
      };
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: finish });
      if (background) timeline.to(background, { scale: 1, duration: 2, ease: "power2.out" }, 0);
      timeline.to(before, { opacity: 1, x: 0, duration: 0.6 }, 0.05);
      if (split) timeline.to(split.words, { yPercent: 0, duration: 0.95, ease: "power4.out", stagger: 0.055 }, 0.1);
      else timeline.to(heading, { opacity: 1, y: 0, duration: 0.85 }, 0.1);
      timeline.to(after, { opacity: 1, y: 0, duration: 0.7, stagger: 0.07 }, 0.42);

      cleanups.push(() => { timeline.kill(); finish(); });
    });
  }

  // The home hero photo pushes in gently and the text drifts up as you scroll.
  let heroParallax = null;
  function applyParallax(scroll) {
    if (!heroParallax) return;
    const { hero, background, copy } = heroParallax;
    const end = hero.offsetTop + hero.offsetHeight;
    if (end <= 0) return;
    const progress = Math.min(Math.max(scroll / end, 0), 1);
    gsap.set(background, { scale: 1 + 0.16 * progress, yPercent: 8 * progress });
    if (copy) gsap.set(copy, { y: -56 * progress, opacity: 1 - 0.65 * progress });
  }

  /* ------------------------------------------------------------------
   * Scrolling strip: drifts by itself, speeds up and turns with the scroll
   * ------------------------------------------------------------------ */
  function setUpMarquee() {
    const strip = document.querySelector(".mo-marquee");
    const track = strip && strip.querySelector(".mo-marquee-track");
    const group = track && track.querySelector(".mo-marquee-group");
    if (!group) return;

    const setX = gsap.quickSetter(track, "x", "px");
    let width = 0;
    let x = 0;
    let direction = -1;
    let velocity = 0;
    let lastScroll = window.scrollY;
    let running = false;

    const build = () => {
      qsa("[data-mo-clone]", track).forEach(clone => clone.remove());
      width = group.getBoundingClientRect().width;
      if (!width) return;
      const copies = Math.ceil(strip.offsetWidth / width) + 1;
      for (let i = 0; i < copies; i += 1) {
        const clone = group.cloneNode(true);
        clone.setAttribute("data-mo-clone", "");
        track.appendChild(clone);
      }
    };

    const tick = (time, delta) => {
      if (!width) return;
      const seconds = Math.min(delta, 64) / 1000;
      if (!seconds) return;
      const scroll = window.scrollY;
      velocity += ((scroll - lastScroll) / seconds - velocity) * 0.1;
      lastScroll = scroll;
      if (Math.abs(velocity) > 30) direction = velocity > 0 ? -1 : 1;
      const base = compact.matches ? 34 : 46;
      x += direction * base * (1 + Math.min(Math.abs(velocity) / 420, 5)) * seconds;
      if (x <= -width) x += width;
      else if (x > 0) x -= width;
      setX(x);
    };

    const run = on => {
      if (on === running) return;
      running = on;
      if (on) { lastScroll = window.scrollY; velocity = 0; gsap.ticker.add(tick); }
      else gsap.ticker.remove(tick);
    };

    build();
    let observer = null;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(entries => run(entries.some(entry => entry.isIntersecting)));
      observer.observe(strip);
    } else {
      run(true);
    }
    let timer = 0;
    const onResize = () => { window.clearTimeout(timer); timer = window.setTimeout(build, 200); };
    window.addEventListener("resize", onResize, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (active) build(); });

    cleanups.push(() => {
      run(false);
      if (observer) observer.disconnect();
      window.removeEventListener("resize", onResize);
      qsa("[data-mo-clone]", track).forEach(clone => clone.remove());
      gsap.set(track, { clearProps: "transform" });
    });
  }

  /* ------------------------------------------------------------------
   * Rating counts up when it scrolls into view
   * ------------------------------------------------------------------ */
  function setUpCountUp() {
    const number = document.querySelector(".cafe-rating-number");
    if (!number || !belowFold(number)) return;
    const count = () => {
      // The live Google rating may have replaced the saved one by now.
      const text = number.firstChild;
      if (!text || text.nodeType !== Node.TEXT_NODE) return;
      const target = parseFloat(text.nodeValue);
      if (!(target > 0)) return;
      const state = { value: 0 };
      let written = text.nodeValue;
      const tween = gsap.to(state, {
        value: target,
        duration: 1.4,
        ease: "power2.out",
        onUpdate: () => {
          // If the live rating arrives mid-count, leave it alone.
          if (!text.isConnected || text.nodeValue !== written) { tween.kill(); return; }
          written = state.value.toFixed(1);
          text.nodeValue = written;
        }
      });
    };
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      if (active) count();
    }, { rootMargin: "0px 0px -10% 0px" });
    observer.observe(number);
    cleanups.push(() => observer.disconnect());
  }

  /* ------------------------------------------------------------------
   * Sparks on buttons and links
   * ------------------------------------------------------------------ */
  function setUpSparks() {
    const TARGETS = ".btn, .text-link, .experience-link, .group-photo, .visit-shortcuts a, .cafe-tabs a, .cafe-review-link, .mobile-toggle";
    const SIZE = 132;
    const COUNT = 8;
    const LIFE = 460;
    let canvas = null;
    let pen = null;
    let started = 0;
    let colour = "";
    let running = false;

    const draw = () => {
      const progress = Math.min((performance.now() - started) / LIFE, 1);
      pen.clearRect(0, 0, SIZE, SIZE);
      if (progress >= 1) {
        gsap.ticker.remove(draw);
        running = false;
        canvas.style.display = "none";
        return;
      }
      const eased = 1 - Math.pow(1 - progress, 3);
      const reach = 16 + eased * 30;
      const length = 11 * (1 - eased);
      pen.strokeStyle = colour;
      pen.lineWidth = 2;
      pen.lineCap = "round";
      pen.globalAlpha = 1 - progress * 0.35;
      for (let i = 0; i < COUNT; i += 1) {
        const angle = (Math.PI * 2 * i) / COUNT - Math.PI / 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        pen.beginPath();
        pen.moveTo(SIZE / 2 + cos * reach, SIZE / 2 + sin * reach);
        pen.lineTo(SIZE / 2 + cos * (reach + length), SIZE / 2 + sin * (reach + length));
        pen.stroke();
      }
    };

    const burst = (x, y, tone) => {
      if (!canvas) {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas = document.createElement("canvas");
        canvas.className = "mo-spark";
        canvas.setAttribute("aria-hidden", "true");
        canvas.width = SIZE * ratio;
        canvas.height = SIZE * ratio;
        pen = canvas.getContext("2d");
        if (!pen) { canvas = null; return; }
        pen.scale(ratio, ratio);
        body.appendChild(canvas);
      }
      canvas.style.display = "";
      canvas.style.left = `${x - SIZE / 2}px`;
      canvas.style.top = `${y - SIZE / 2}px`;
      colour = tone;
      started = performance.now();
      if (!running) { running = true; gsap.ticker.add(draw); }
    };

    const onClick = event => {
      const target = event.target.closest && event.target.closest(TARGETS);
      if (!target || target.disabled) return;
      let x = event.clientX;
      let y = event.clientY;
      if (!x && !y) { // keyboard activation
        const box = target.getBoundingClientRect();
        x = box.left + box.width / 2;
        y = box.top + box.height / 2;
      }
      const onLight = target.closest(".light-band, .form-card") && !target.matches(".btn-dark");
      burst(x, y, onLight ? "#b0822a" : "#f3d98f");
    };
    document.addEventListener("click", onClick, true);
    cleanups.push(() => {
      document.removeEventListener("click", onClick, true);
      if (running) gsap.ticker.remove(draw);
      if (canvas) canvas.remove();
    });
  }

  /* ------------------------------------------------------------------
   * Mouse-only touches: spotlight cards, tilting photo cards, magnet buttons
   * ------------------------------------------------------------------ */
  function setUpPointerEffects() {
    if (!finePointer.matches) return;

    // Spotlight. Looked up on the fly so the live review cards get it too.
    const SPOT = ".cafe-review-card, .footer-cta, .trust-item, .use-case, .hours, .group-photo";
    let lit = null;
    let lastMove = null;
    let queued = false;

    const dress = card => {
      if (card.classList.contains("mo-spot")) return;
      if (window.getComputedStyle(card).position === "static") card.style.position = "relative";
      ["mo-spot-glow", "mo-spot-edge"].forEach(name => {
        const layer = document.createElement("span");
        layer.className = name;
        layer.setAttribute("aria-hidden", "true");
        card.appendChild(layer);
      });
      card.classList.add("mo-spot");
    };

    // Tilt for the photo cards.
    const tilts = new WeakMap();
    const tiltFor = card => {
      let tilt = tilts.get(card);
      if (!tilt) {
        gsap.set(card, { transformPerspective: 900 });
        tilt = {
          x: gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power3.out" }),
          y: gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power3.out" })
        };
        tilts.set(card, tilt);
      }
      return tilt;
    };
    const level = card => {
      const tilt = card && tilts.get(card);
      if (tilt) { tilt.x(0); tilt.y(0); }
    };

    // Magnets: primary buttons lean towards a nearby cursor.
    const magnets = qsa(".hero .btn-primary, .footer-cta .btn-primary, .cafe-site-header .btn-primary").map(element => {
      const offset = { x: 0, y: 0 };
      const apply = () => {
        element.style.translate = Math.abs(offset.x) > 0.05 || Math.abs(offset.y) > 0.05
          ? `${offset.x.toFixed(2)}px ${offset.y.toFixed(2)}px`
          : "";
      };
      return {
        element,
        offset,
        x: gsap.quickTo(offset, "x", { duration: 0.5, ease: "power3.out", onUpdate: apply }),
        y: gsap.quickTo(offset, "y", { duration: 0.5, ease: "power3.out", onUpdate: apply })
      };
    });

    const update = () => {
      queued = false;
      const event = lastMove;
      if (!event || !active) return;

      const card = event.target.closest ? event.target.closest(SPOT) : null;
      if (card !== lit) {
        if (lit) { lit.classList.remove("mo-spot-on"); level(lit); }
        lit = card && !card.hasAttribute("data-mo") ? card : null;
        if (lit) { dress(lit); lit.classList.add("mo-spot-on"); }
      }
      if (lit) {
        const box = lit.getBoundingClientRect();
        const px = event.clientX - box.left;
        const py = event.clientY - box.top;
        lit.style.setProperty("--mo-x", `${px.toFixed(1)}px`);
        lit.style.setProperty("--mo-y", `${py.toFixed(1)}px`);
        if (lit.matches(".group-photo") && box.width && box.height) {
          const tilt = tiltFor(lit);
          tilt.y((px / box.width - 0.5) * 9);
          tilt.x((0.5 - py / box.height) * 9);
        }
      }

      magnets.forEach(magnet => {
        const box = magnet.element.getBoundingClientRect();
        if (!box.width) return;
        const dx = event.clientX - (box.left - magnet.offset.x + box.width / 2);
        const dy = event.clientY - (box.top - magnet.offset.y + box.height / 2);
        const near = Math.abs(dx) < box.width / 2 + 46 && Math.abs(dy) < box.height / 2 + 46;
        magnet.x(near ? dx * 0.26 : 0);
        magnet.y(near ? dy * 0.26 : 0);
      });
    };

    const onMove = event => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      lastMove = event;
      if (!queued) { queued = true; window.requestAnimationFrame(update); }
    };
    const onLeave = () => {
      lastMove = null;
      if (lit) { lit.classList.remove("mo-spot-on"); level(lit); lit = null; }
      magnets.forEach(magnet => { magnet.x(0); magnet.y(0); });
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave);
    cleanups.push(() => {
      document.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      onLeave();
      magnets.forEach(magnet => { magnet.element.style.translate = ""; });
    });
  }

  /* ------------------------------------------------------------------
   * Lenis smooth scrolling — mouse and trackpad only; touch stays native
   * ------------------------------------------------------------------ */
  function setUpSmoothScroll() {
    if (!Lenis || !finePointer.matches) return;
    const navigation = document.getElementById("site-navigation");
    if (navigation) navigation.setAttribute("data-lenis-prevent", "");

    lenis = new Lenis({ lerp: 0.11, anchors: true, allowNestedScroll: true, stopInertiaOnNavigate: true });
    lenis.on("scroll", instance => applyParallax(instance.scroll));
    const frame = time => { if (lenis) lenis.raf(time * 1000); };
    gsap.ticker.add(frame);

    // While the pull-down menu is open the page behind must stay put.
    const syncMenu = () => {
      if (!lenis) return;
      if (body.classList.contains("navigation-open")) lenis.stop();
      else lenis.start();
    };
    const menuWatcher = new MutationObserver(syncMenu);
    menuWatcher.observe(body, { attributes: true, attributeFilter: ["class"] });

    cleanups.push(() => {
      menuWatcher.disconnect();
      gsap.ticker.remove(frame);
      if (lenis) { lenis.destroy(); lenis = null; }
      if (heroParallax) {
        gsap.set(heroParallax.background, { clearProps: "transform" });
        if (heroParallax.copy) gsap.set(heroParallax.copy, { clearProps: "transform,opacity" });
        heroParallax = null;
      }
    });
  }

  /* ------------------------------------------------------------------
   * Start-up and shut-down
   * ------------------------------------------------------------------ */
  function shutDown() {
    if (!active) return;
    active = false;
    revealAll(true);
    cleanups.splice(0).reverse().forEach(cleanup => { try { cleanup(); } catch (_) { /* keep going */ } });
    qsa("[data-mo]").forEach(settle);
    root.classList.remove("mo-on");
    releaseHero();
  }

  try {
    root.classList.add("mo-on");
    setUpHero();
    setUpReveals();
    setUpMarquee();
    setUpCountUp();
    setUpSparks();
    setUpPointerEffects();
    setUpSmoothScroll();
  } catch (error) {
    shutDown();
    if (window.console) console.warn("[TBGC motion] Switched off:", error && error.message ? error.message : error);
    return;
  }

  // Someone turning on "reduce motion" mid-visit gets the plain page at once.
  const onPreference = event => { if (event.matches) shutDown(); };
  if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", onPreference);
})();
