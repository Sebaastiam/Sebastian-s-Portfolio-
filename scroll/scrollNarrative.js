/* ══════════════════════════════════════════════════════════
   scrollNarrative.js
   Landing Redesign — Module 3 of 4 (Scroll Narrative)
   Sebastián Castillo Portfolio — Engineering Pass v3.2 → UX/UI Phase
   Depends on: scroll-narrative-config.js (must load BEFORE this file)

   PERFORMANCE DESIGN (this is the part that matters most in this
   file, given everything this project has already learned the hard
   way about scroll/pointer handlers):
   - Passive root-scroll listeners, rAF-batched — document capture
     covers scrolling on <html> and the window listener remains as a
     fallback. Scroll math never runs more than once per frame,
     regardless of how many scroll events fire.
   - Parallax is only ever COMPUTED for stops currently intersecting
     the viewport (tracked via IntersectionObserver), never for
     off-screen stops — so this doesn't get more expensive as more
     stops are added later.
   - will-change is toggled per-stop by CSS (.is-active), not set
     unconditionally — the exact mistake already found and fixed
     elsewhere in this project (.bg-img, .port-grid-item img) is not
     repeated here.

   HOW TO USE:
   1. Add <div class="narrative" id="scrollNarrative"></div> where
      the narrative should render.
   2. Load scroll-narrative-config.js, then this file, in that order.
   3. See SCROLL_NARRATIVE_GUIDE.md for full integration + how the
      hero card (Module 1) connects to the last stop.
   ══════════════════════════════════════════════════════════ */

(function initScrollNarrative() {
  const root = document.getElementById('scrollNarrative');
  if (!root || typeof SCROLL_NARRATIVE_CONFIG === 'undefined' || !SCROLL_NARRATIVE_CONFIG.length) return;

  /* ── Curva de la parada, en términos de "progress" (0 → 1 = todo el recorrido
     propio de la parada, ver updateParallax): ──

     0 ── ZOOM_START ──────────────────────────────── 1  (el zoom nunca se detiene:
     │ estático │ ················· zoom in continuo, hasta el final ·········· │   sigue creciendo
                                                                                     todo el trayecto)

     0 ──────────────── BLUR_START ─────────────────── 1  (desenfoque + fundido,
     │ ── nítido, sin cambios ── │ ·· blur y opacidad bajan gradualmente ·· 0 │   SIN traslación en Y)

     Sin movimiento vertical: es puro "travelling" de eje Z (dolly zoom-in). El
     zoom es continuo y se extiende hasta el final del recorrido — no termina a
     mitad de camino como antes. El desenfoque/fundido es una curva aparte y
     gradual (no un "salto"), y solo toca blur + opacity, nunca la posición. */
  const ZOOM_START = 0.1;    /* Tramo estático inicial, breve. Ej: 0 (zoom desde el primer píxel) / 0.2 (más quieto al inicio) */
  const BLUR_START = 0.5;    /* Desde acá arranca el desenfoque/fundido gradual. Ej: 0.4 (empieza antes, más gradual) / 0.65 (nítido más tiempo) */
  const MAX_SCALE = 2.6;     /* Qué tan "adentro" termina la imagen. Ej: 2.2 (más sutil) / 3 (dolly más agresivo) */
  const EXIT_BLUR_PX = 22;   /* Desenfoque máximo al final del todo. Ej: 16 (más leve) / 28 (más pronunciado) */

  /* ── Profundidad (paralaje diferencial): cada capa tiene un depth (0 = fondo,
     1,2,3... = cada plano hacia adelante, ver config). A más depth, más zoom
     recibe esa capa respecto al fondo — así el streetlamp en primer plano
     "se acerca" mucho más rápido que el skyline lejano, como en una cámara
     multiplano. multiplier(depth) = 1 + depth * DEPTH_INTENSITY. */
  const DEPTH_INTENSITY = 0.18; /* Cuánto más zoom por nivel de profundidad. Ej: 0.1 (sutil) / 0.3 (muy exagerado) */

  const stopEls = []; /* { el, frameEl, visuals: [{el}], isLastStop, inRange } */

  /* ── Build DOM from config ── */
  SCROLL_NARRATIVE_CONFIG.forEach((stop, i) => {
    const stopEl = document.createElement('div');
    stopEl.className = 'narrative-stop' + (stop.isLastStop ? ' narrative-stop--hero' : '');
    stopEl.style.setProperty('--stack-order', String(SCROLL_NARRATIVE_CONFIG.length - i));
    if (stop.scrollLength) stopEl.style.setProperty('--stop-height', stop.scrollLength);

    const frame = document.createElement('div');
    frame.className = 'narrative-stop__frame';

    /* Background */
    const bg = document.createElement('div');
    bg.className = 'narrative-stop__bg';
    if (stop.background && stop.background.src) {
      if (/\.(webm|mp4)$/i.test(stop.background.src)) {
        const v = document.createElement('video');
        v.src = stop.background.src;
        v.autoplay = true; v.muted = true; v.loop = true; v.playsInline = true;
        bg.appendChild(v);
      } else {
        const img = document.createElement('img');
        img.src = stop.background.src;
        img.loading = i === 0 ? 'eager' : 'lazy'; /* first stop is likely visible near page load */
        img.alt = '';
        bg.appendChild(img);
      }
    } else {
      bg.classList.add('narrative-stop__bg--placeholder');
    }
    frame.appendChild(bg);

    /* Cada capa (bg incluido) es un plano óptico con su propia profundidad.
       depth 0 = el fondo, la referencia; depth mayor = más cerca de cámara,
       zoom proporcionalmente mayor. Ver DEPTH_INTENSITY arriba. */
    const visualRefs = [{ el: bg, depth: 0 }];

    /* Foreground layers */
    (stop.layers || []).forEach((layer, li) => {
      const layerEl = document.createElement('div');
      layerEl.className = 'narrative-stop__layer';
      /* depth es explícito en la config (far=1, mid=2, near=3...) — no depende del
         orden del array. Si falta, usamos la posición como fallback razonable. */
      const depth = typeof layer.depth === 'number' ? layer.depth : li + 1;
      layerEl.style.zIndex = String(depth); /* jerarquía explícita: no hay que confiar en el orden del DOM */
      if (layer.src) {
        const img = document.createElement('img');
        img.src = layer.src;
        img.loading = 'lazy';
        img.alt = '';
        layerEl.appendChild(img);
      } else {
        layerEl.classList.add('narrative-stop__layer--placeholder');
        layerEl.setAttribute('data-layer-label', 'layer ' + depth);
        layerEl.setAttribute('data-layer-depth', String(depth));
      }
      frame.appendChild(layerEl);
      visualRefs.push({ el: layerEl, depth });
    });

    /* Text (or, on the last stop, the hero card slot) */
    if (stop.isLastStop) {
      const heroMount = document.getElementById('glassModule');
      if (heroMount) {
        frame.appendChild(heroMount); /* re-parent the existing hero card here — not duplicated, not recreated */
        heroMount.style.left = '';
        heroMount.style.top = '';
      }
    } else {
      const text = document.createElement('div');
      text.className = 'narrative-stop__text';
      const h = document.createElement('h2');
      h.className = 'narrative-stop__header';
      h.textContent = stop.header || '';
      text.appendChild(h);
      if (stop.description) {
        const p = document.createElement('p');
        p.className = 'narrative-stop__desc';
        p.textContent = stop.description;
        text.appendChild(p);
      }
      frame.appendChild(text);
    }

    /* Modelo 3D (opcional) — el <canvas> se crea ya, pero el motor tres.js
       y el .glb sólo se cargan cuando el scroll entra a su ventana de
       reveal (ver initModelViewer). Nunca cuesta nada antes de eso. */
    let modelCanvas = null;
    if (stop.model && stop.model.src) {
      modelCanvas = document.createElement('div');
      modelCanvas.className = 'narrative-stop__model-canvas';
      frame.appendChild(modelCanvas);
    }

    stopEl.appendChild(frame);
    root.appendChild(stopEl);
    stopEls.push({
      el: stopEl, frameEl: frame, visuals: visualRefs,
      isLastStop: Boolean(stop.isLastStop), inRange: false,
      model: stop.model ? { config: stop.model, canvas: modelCanvas, viewer: null, loading: false } : null,
    });
  });

  /* ── IntersectionObserver: tracks which stops are anywhere near
     the viewport (inRange — parallax gets computed) and which one
     is substantially centered (is-active — text/hero reveal) ── */
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const stop = stopEls.find(s => s.el === entry.target);
      if (!stop) return;
      stop.inRange = entry.isIntersecting;
      const activeThreshold = stop.isLastStop ? 0.45 : 0.5;
      stop.el.classList.toggle('is-active', entry.isIntersecting && entry.intersectionRatio >= activeThreshold);
    });
  }, { threshold: [0, 0.45, 0.5] });

  stopEls.forEach(s => io.observe(s.el));

  /* ── Barra de progreso — un solo elemento, fuera de .narrative para no
     interferir con los z-index internos de las paradas. ── */
  const progressBar = document.createElement('div');
  progressBar.className = 'narrative-progress';
  progressBar.innerHTML = '<div class="narrative-progress__fill"></div>';
  document.body.appendChild(progressBar);
  const progressFill = progressBar.querySelector('.narrative-progress__fill');

  /* ── Scroll handling: passive listener + rAF batching, same
     pattern already fixed into drag.js this session ── */
  let rafId = 0;

  function updateParallax() {
    rafId = 0;
    stopEls.forEach(stop => {
      if (!stop.inRange) { pauseModel(stop); return; } /* never compute for off-screen stops */
      const rect = stop.el.getBoundingClientRect();
      const span = rect.height - window.innerHeight; /* total scrollable range within this stop */
      if (span <= 0) return;
      /* rect.top is viewport-relative: 0 = stop just entered, -span = fully scrolled through */
      const progress = Math.min(1, Math.max(0, -rect.top / span));
      const zoomProgress = progress <= ZOOM_START
        ? 0
        : (progress - ZOOM_START) / (1 - ZOOM_START); /* nunca se topa con un techo antes de progress=1 */
      const blurFadeProgress = progress <= BLUR_START ? 0 : (progress - BLUR_START) / (1 - BLUR_START);
      const blur = blurFadeProgress * EXIT_BLUR_PX;
      const opacity = 1 - blurFadeProgress;
      stop.visuals.forEach(visual => {
        /* Cada plano zoomea a su propio ritmo según su profundidad — el fondo
           (depth 0) usa MAX_SCALE tal cual; cada nivel de profundidad encima
           se acerca proporcionalmente más rápido. */
        const depthMultiplier = 1 + (visual.depth * DEPTH_INTENSITY);
        const scale = 1 + ((MAX_SCALE - 1) * zoomProgress * depthMultiplier);
        visual.el.style.setProperty('--scale', String(scale));
        visual.el.style.setProperty('--blur', blur + 'px');
        visual.el.style.setProperty('--opacity', String(opacity));
      });
      if (stop.model) updateModel(stop, progress);
    });
    updateProgressBar();
  }

  /* ── Progreso global: qué % del alto TOTAL de .narrative ya se scrolleó. ── */
  function updateProgressBar() {
    const rect = root.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const done = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
    progressFill.style.setProperty('--narrative-progress', String(done));
    progressFill.style.width = (done * 100) + '%';
  }

  /* ── Modelo 3D: aparece/enfoca entre revealFrom y revealTo (progress
     PROPIO de la parada). Fuera de esa ventana, pausado — no renderiza,
     no cuesta nada. La carga del motor + .glb es perezosa, una sola vez. ── */
  function updateModel(stop, progress) {
    const { config, canvas } = stop.model;
    const from = config.revealFrom ?? 0.5, to = config.revealTo ?? 1;
    if (progress < from) { pauseModel(stop); return; }
    const t = Math.min(1, (progress - from) / Math.max(0.001, to - from)); /* 0→1 dentro de la ventana */
    canvas.style.setProperty('--model-opacity', String(t));
    canvas.style.setProperty('--model-blur', ((1 - t) * 14) + 'px');
    canvas.style.setProperty('--model-scale', String(0.85 + t * 0.55)); /* 0.85 → 1.4, "se acerca" junto con el resto */
    if (!stop.model.viewer && !stop.model.loading) loadModel(stop);
    if (stop.model.viewer) stop.model.viewer.setFocus(t); /* rotación/foco sutil, no continuo */
    resumeRender(stop);
  }

  function pauseModel(stop) {
    if (stop.model && stop.model.viewer) stop.model.viewer.pause();
  }
  function resumeRender(stop) {
    if (stop.model && stop.model.viewer) stop.model.viewer.resume();
  }

  function loadModel(stop) {
    stop.model.loading = true;
    initModelViewer(stop.model.canvas, stop.model.config.src)
      .then(viewer => { stop.model.viewer = viewer; })
      .catch(err => console.warn('[scroll-narrative] modelo 3D no cargó:', err));
  }

  function onScroll() {
    if (document.hidden) return;
    if (!rafId) rafId = requestAnimationFrame(updateParallax);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
  updateParallax(); /* initial paint, in case the page loads already scrolled */
})();

/* ══════════════════════════════════════════════════════════
   initModelViewer — motor tres.js aislado, un módulo por <canvas>.
   Carga perezosa (import dinámico, sólo cuando el scroll lo necesita),
   pixelRatio limitado, y render sólo bajo demanda (pause/resume) —
   nunca un requestAnimationFrame infinito, la lección de esta sesión.
   ══════════════════════════════════════════════════════════ */
function initModelViewer(container, glbSrc) {
  const threeUrl = new URL('../node_modules/three/build/three.module.js', window.location.href);
  const gltfLoaderUrl = new URL('../node_modules/three/examples/jsm/loaders/GLTFLoader.js', window.location.href);

  return Promise.all([
    import(threeUrl.href),
    import(gltfLoaderUrl.href),
  ]).then(([THREE_MODULE, { GLTFLoader }]) => {
    const THREE = THREE_MODULE;
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); /* Android: nunca DPR completo */
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.LinearToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 4);

    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const dir = new THREE.DirectionalLight(0xffffff, 2.5);
    dir.position.set(2, 3, 4);
    scene.add(dir);

    let model = null;
    let paused = true;
    let raf = 0;

    function resize() {
      const w = container.clientWidth || 300, h = container.clientHeight || 300;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    function tick() {
      raf = 0;
      if (paused) return;
      renderer.render(scene, camera);
    }
    function requestFrame() { if (!raf) raf = requestAnimationFrame(tick); }

    new GLTFLoader().load(glbSrc, gltf => {
      model = gltf.scene;
      /* Centrar y normalizar escala — cualquier .glb, sin importar sus
         unidades originales, queda encuadrado igual. */
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      model.scale.setScalar(1.6 / maxDim);
      model.position.sub(center.multiplyScalar(1.6 / maxDim));
      scene.add(model);
      requestFrame();
    });

    return {
      setFocus(t) {
        /* Rotación sutil ligada al progreso, no una animación infinita */
        if (model) model.rotation.y = t * Math.PI * 0.6;
        requestFrame();
      },
      pause() { paused = true; },
      resume() { paused = false; requestFrame(); },
    };
  });
}

/* ── Contact Section Animation Observer ── */
(function initContactObserver() {
  const contactSection = document.getElementById('contactSection');
  if (!contactSection) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      // Toggle .is-active when at least 20% of the section is visible
      if (entry.isIntersecting) {
        contactSection.classList.add('is-active');
      } else {
        // Optional: remove class if you want it to animate out when scrolling back up
        contactSection.classList.remove('is-active');
      }
    });
  }, { threshold: 0.2 });

  observer.observe(contactSection);
})();