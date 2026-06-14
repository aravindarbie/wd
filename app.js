(function () {
  const config = window.WEDDING_CONFIG;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const cover = $("#cover");
  const site = $("#site");
  const music = $("#weddingMusic");
  const enterButton = $("#enterButton");
  const scratchCard = $("#scratchCard");
  const scratchCanvas = $("#scratchCanvas");
  const scratchHint = $("#scratchHint");
  const petalCanvas = $("#petalCanvas");
  const galleryList = $("#galleryList");
  const mapLink = $("#mapLink");
  const rsvpForm = $("#rsvpForm");
  const rsvpNote = $("#rsvpNote");
  let petalsStarted = false;

  function setConfigText() {
    document.title = config.socialTitle;
    $$("[data-config]").forEach((node) => {
      const key = node.dataset.config;
      if (Object.prototype.hasOwnProperty.call(config, key)) {
        node.textContent = config[key];
      }
    });

    music.src = config.music;
    mapLink.href = config.mapsLink;
    setMeta("description", config.socialSubtitle);
    setMeta("og:title", config.socialTitle, "property");
    setMeta("og:description", config.socialSubtitle, "property");
    setMeta("og:image", config.socialImage, "property");
    setMeta("twitter:title", config.socialTitle);
    setMeta("twitter:description", config.socialSubtitle);
    setMeta("twitter:image", config.socialImage);
  }

  function setMeta(name, content, attr = "name") {
    const tag = document.querySelector(`meta[${attr}="${name}"]`);
    if (tag) tag.setAttribute("content", content);
  }

  function openInvitation() {
    cover.classList.add("is-open");
    site.classList.add("is-visible");
    fadeInMusic();
    window.setTimeout(() => site.scrollIntoView({ block: "start" }), 420);
  }

  function fadeInMusic() {
    music.volume = 0;
    const play = music.play();
    if (play && typeof play.then === "function") {
      play.then(() => {
        let volume = 0;
        const timer = window.setInterval(() => {
          volume = Math.min(volume + 0.04, 0.58);
          music.volume = volume;
          if (volume >= 0.58) window.clearInterval(timer);
        }, 120);
      }).catch(() => {});
    }
  }

  function buildGallery() {
    const fragment = document.createDocumentFragment();
    config.photos.forEach((photo, index) => {
      const figure = document.createElement("figure");
      figure.className = "photo-story";
      figure.innerHTML = `
        <img src="${photo.src}" alt="${photo.alt}" loading="lazy" decoding="async">
        <figcaption class="photo-story__caption">
          <strong>${photo.caption}</strong>
          <span>${String(index + 1).padStart(2, "0")}</span>
        </figcaption>
      `;
      fragment.appendChild(figure);
    });
    galleryList.appendChild(fragment);
  }

  function initRevealObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-in");
      });
    }, { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });

    $$(".reveal, .photo-story").forEach((node) => observer.observe(node));
  }

  function initCountdown() {
    const target = new Date(config.weddingDateISO).getTime();
    const nodes = {
      days: $('[data-count="days"]'),
      hours: $('[data-count="hours"]'),
      minutes: $('[data-count="minutes"]'),
      seconds: $('[data-count="seconds"]')
    };

    function tick() {
      const remaining = Math.max(target - Date.now(), 0);
      const seconds = Math.floor(remaining / 1000);
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      nodes.days.textContent = days;
      nodes.hours.textContent = String(hours).padStart(2, "0");
      nodes.minutes.textContent = String(minutes).padStart(2, "0");
      nodes.seconds.textContent = String(secs).padStart(2, "0");
    }

    tick();
    window.setInterval(tick, 1000);
  }

  function initScratchCard() {
    const ctx = scratchCanvas.getContext("2d", { willReadFrequently: true });
    let drawing = false;
    let revealed = false;
    let lastCheck = 0;

    function resize() {
      const rect = scratchCard.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      scratchCanvas.width = Math.max(1, Math.floor(rect.width * ratio));
      scratchCanvas.height = Math.max(1, Math.floor(rect.height * ratio));
      scratchCanvas.style.width = `${rect.width}px`;
      scratchCanvas.style.height = `${rect.height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      paintMask(rect.width, rect.height);
    }

    function paintMask(width, height) {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#f9df82");
      gradient.addColorStop(0.38, "#d4af37");
      gradient.addColorStop(0.72, "#9e7419");
      gradient.addColorStop(1, "#ffe9a4");
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.globalAlpha = 0.22;
      for (let i = 0; i < 220; i += 1) {
        ctx.fillStyle = i % 2 ? "#fffdf9" : "#6c4a07";
        ctx.beginPath();
        ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 1.4 + 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(255, 253, 249, 0.86)";
      ctx.font = "700 13px Segoe UI, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SCRATCH HERE", width / 2, height / 2);
    }

    function scratch(event) {
      if (!drawing || revealed) return;
      const rect = scratchCanvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();

      const now = performance.now();
      if (now - lastCheck > 220) {
        lastCheck = now;
        checkProgress();
      }
    }

    function checkProgress() {
      const sample = ctx.getImageData(0, 0, scratchCanvas.width, scratchCanvas.height).data;
      let transparent = 0;
      for (let i = 3; i < sample.length; i += 16) {
        if (sample[i] < 25) transparent += 1;
      }
      const progress = transparent / (sample.length / 16);
      if (progress >= 0.6) {
        revealed = true;
        scratchCard.classList.add("is-revealed");
        scratchHint.textContent = "";
        burstPetals();
      }
    }

    scratchCanvas.addEventListener("pointerdown", (event) => {
      drawing = true;
      scratchCanvas.setPointerCapture(event.pointerId);
      scratch(event);
    });
    scratchCanvas.addEventListener("pointermove", scratch);
    scratchCanvas.addEventListener("pointerup", () => {
      drawing = false;
      checkProgress();
    });
    scratchCanvas.addEventListener("pointercancel", () => {
      drawing = false;
    });

    window.addEventListener("resize", resize, { passive: true });
    resize();
  }

  function burstPetals() {
    const ctx = petalCanvas.getContext("2d");
    const ratio = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    petalCanvas.width = Math.floor(width * ratio);
    petalCanvas.height = Math.floor(height * ratio);
    petalCanvas.style.width = `${width}px`;
    petalCanvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const particles = Array.from({ length: 74 }, (_, i) => ({
      x: width / 2 + (Math.random() - 0.5) * width * 0.72,
      y: height * 0.38 + Math.random() * 20,
      vx: (Math.random() - 0.5) * 1.2,
      vy: Math.random() * 1.2 + 0.9,
      size: Math.random() * 7 + 3,
      rotate: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.08,
      color: i % 3 === 0 ? "#d4af37" : i % 3 === 1 ? "#f2c3bd" : "#fff1d1",
      life: 1
    }));

    if (petalsStarted) return;
    petalsStarted = true;
    const started = performance.now();

    function frame(now) {
      ctx.clearRect(0, 0, width, height);
      const elapsed = now - started;
      particles.forEach((p) => {
        p.x += p.vx + Math.sin(now / 500 + p.size) * 0.35;
        p.y += p.vy;
        p.rotate += p.spin;
        p.life = Math.max(1 - elapsed / 4200, 0);
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotate);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.55, p.size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      if (elapsed < 4300) {
        requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, width, height);
        petalsStarted = false;
      }
    }

    requestAnimationFrame(frame);
  }

  function initRsvp() {
    rsvpForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(rsvpForm);
      const name = String(data.get("name") || "").trim();
      const attendance = String(data.get("attendance") || "");
      const message = String(data.get("message") || "").trim();
      const body = [
        `RSVP for ${config.groomName} and ${config.brideName}`,
        `Name: ${name}`,
        `Response: ${attendance}`,
        message ? `Message: ${message}` : ""
      ].filter(Boolean).join("\n");

      rsvpNote.classList.add("is-visible");

      if (config.whatsappNumber) {
        window.open(`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(body)}`, "_blank", "noopener");
      } else if (config.rsvpEmail) {
        window.location.href = `mailto:${config.rsvpEmail}?subject=${encodeURIComponent("Wedding RSVP")}&body=${encodeURIComponent(body)}`;
      } else {
        navigator.clipboard?.writeText(body).catch(() => {});
        window.open(`https://wa.me/?text=${encodeURIComponent(body)}`, "_blank", "noopener");
      }
    });
  }

  setConfigText();
  buildGallery();
  initRevealObserver();
  initCountdown();
  initScratchCard();
  initRsvp();
  enterButton.addEventListener("click", openInvitation);
})();
