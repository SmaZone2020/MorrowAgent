// Morrow Agent roadshow deck · navigation, choreography and slide lifecycle.
window.deckInit = () => {
  const stage = document.getElementById("stage");
  const slides = Array.from(stage.querySelectorAll(".slide"));
  const progress = document.getElementById("progress");
  const counter = document.getElementById("counter");
  const hint = document.getElementById("hint");
  let index = 0;
  let timers = [];

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  // Children that opt into staggering get their entrance delay spaced out, so
  // long grids arrive as a cascade instead of one solid block.
  const choreograph = (slide) => {
    slide.querySelectorAll("[data-stag]").forEach((group) => {
      const start = Number(group.dataset.d || 0);
      const step = Number(group.dataset.stag || 0.06);
      group
        .querySelectorAll(":scope > .a, :scope > .a-l, :scope > .a-r, :scope > .a-s")
        .forEach((child, i) => child.style.setProperty("--d", `${start + i * step}s`));
    });
  };

  // Any element carrying data-seq-item is lit in reading order. The seven loop
  // nodes and the seven list rows therefore advance in lockstep.
  const runSequences = (slide) => {
    clearTimers();
    const items = Array.from(slide.querySelectorAll("[data-seq-item]"));
    if (items.length === 0) return;
    const step = Number(slide.querySelector("[data-seq]")?.dataset.seq || 340);
    items.forEach((item) => item.classList.remove("on", "hot"));
    items.forEach((item, i) => {
      timers.push(
        setTimeout(() => item.classList.add("on", "hot"), 600 + i * step),
      );
    });
  };

  const show = (n) => {
    index = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach((s, i) => s.classList.toggle("active", i === index));
    const current = slides[index];
    progress.style.width = `${((index + 1) / slides.length) * 100}%`;
    counter.innerHTML = `<b>${String(index + 1).padStart(2, "0")}</b> / ${slides.length}`;
    current.querySelectorAll(".a,.a-l,.a-r,.a-s,.a-w").forEach((el) => {
      el.style.animation = "none";
      void el.offsetWidth;
      el.style.animation = "";
    });
    choreograph(current);
    runSequences(current);
    // The Lumi rig runs a requestAnimationFrame loop; idle it off-slide so the
    // projector stays at a steady frame rate during the other 17 slides.
    window.LumiPlay?.setActive(!!current.querySelector("[data-lumi]"));
    // file:// hosts can refuse history writes, so the deep link is best-effort.
    try {
      history.replaceState(null, "", `#${index + 1}`);
    } catch {}
  };

  const next = () => show(index + 1);
  const prev = () => show(index - 1);

  // The deck is authored at a fixed 1280x720 canvas and scaled to fit, so every
  // projector shows the same composition instead of reflowing the type.
  const fit = () => {
    const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  };

  window.addEventListener("keydown", (event) => {
    if (event.key === "F5") {
      event.preventDefault();
      document.documentElement.requestFullscreen?.();
      return;
    }
    if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(event.key)) {
      event.preventDefault();
      next();
    } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
      event.preventDefault();
      prev();
    } else if (event.key === "Home") {
      event.preventDefault();
      show(0);
    } else if (event.key === "End") {
      event.preventDefault();
      show(slides.length - 1);
    }
  });

  stage.addEventListener("click", (event) => {
    if (!event.target.closest("a,button")) next();
  });

  let wheelLocked = false;
  window.addEventListener(
    "wheel",
    (event) => {
      if (wheelLocked) return;
      wheelLocked = true;
      setTimeout(() => (wheelLocked = false), 480);
      if (event.deltaY > 0) next();
      else prev();
    },
    { passive: true },
  );

  let touchX = 0;
  window.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
  window.addEventListener(
    "touchend",
    (e) => {
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 60) dx < 0 ? next() : prev();
    },
    { passive: true },
  );

  window.addEventListener("resize", fit);

  fit();
  const start = Number(location.hash.replace("#", "")) || 1;
  show(start - 1);
};
