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

   PERF FIX (Issue #1 — v3.2.1):
   - updateParallax() now separates DOM reads from DOM writes in two
     explicit phases per rAF frame. Previously, getBoundingClientRect()
     reads and style.setProperty() writes were interleaved per stop
     inside the same forEach loop — each write could invalidate the
     layout and force a fresh reflow for the next read. Now all reads
     happen first (computing all values), then all writes apply at once.
     The rAF scheduling was already correct and is unchanged.

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

  /* ── Scroll handling: passive listener + rAF batching ── */
  let rafId = 0;

  function updateParallax() {
    rafId = 0;

    /* PERF FIX: Separate read and write phases to avoid forced reflows.
       Previously, getBoundingClientRect() (read) and style.setProperty()
       (write) were interleaved per-stop in the same forEach, meaning each
       write could invalidate layout and force a fresh reflow for the next
       stop's read. Now all reads happen in one pass, results are stored,
       then all writes happen in a second pass — zero reflows per frame.

       Phase 1 — READ: collect all geometry and compute all values. */
    const updates = [];

    stopEls.forEach(stop => {
      if (!stop.inRange) {
        pauseModel(stop);
        return;
      }

      const rect = stop.el.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      if (span <= 0) return;

      const progress = Math.min(1, Math.max(0, -rect.top / span));
      const zoomProgress = progress <= ZOOM_START
        ? 0
        : (progress - ZOOM_START) / (1 - ZOOM_START);
      const blurFadeProgress = progress <= BLUR_START ? 0 : (progress - BLUR_START) / (1 - BLUR_START);
      const blur    = blurFadeProgress * EXIT_BLUR_PX;
      const opacity = 1 - blurFadeProgress;

      const visualUpdates = stop.visuals.map(visual => {
        const depthMultiplier = 1 + (visual.depth * DEPTH_INTENSITY);
        const scale = 1 + ((MAX_SCALE - 1) * zoomProgress * depthMultiplier);
        return { el: visual.el, scale, blur, opacity };
      });

      updates.push({ stop, progress, visualUpdates });
    });

    /* Progress bar READ (batched with stop reads above conceptually,
       but kept separate since it's a different element) */
    const rootRect = root.getBoundingClientRect();
    const rootTotal = rootRect.height - window.innerHeight;
    const rootDone  = rootTotal > 0 ? Math.min(1, Math.max(0, -rootRect.top / rootTotal)) : 0;

    /* Phase 2 — WRITE: apply all computed values, no reads here. */
    updates.forEach(({ stop, progress, visualUpdates }) => {
      visualUpdates.forEach(({ el, scale, blur, opacity }) => {
        el.style.setProperty('--scale',   String(scale));
        el.style.setProperty('--blur',    blur + 'px');
        el.style.setProperty('--opacity', String(opacity));
      });
      if (stop.model) updateModel(stop, progress);
    });

    /* Progress bar WRITE */
    progressFill.style.setProperty('--narrative-progress', String(rootDone));
    progressFill.style.width = (rootDone * 100) + '%';
  }

  /* ── Modelo 3D: 3 tramos dentro de [revealFrom, fadeOutTo] (progress
     PROPIO de la parada) — fade-in (revealFrom→focusAt), sostenido en foco,
     fade-out (fadeOutFrom→fadeOutTo). El zoom (--model-scale) es continuo
     en toda la ventana, independiente del fade — sigue acercándose aunque
     ya esté a opacidad 1. Fuera de la ventana: pausado, no renderiza. */
  function updateModel(stop, progress) {
    const { config, canvas } = stop.model;
    const from     = config.revealFrom  ?? 0.03;
    const focusAt  = config.revealTo    ?? 0.25;
    const fadeFrom = config.fadeOutFrom ?? 0.88;
    const fadeTo   = config.fadeOutTo   ?? 1;

    if (progress < from || progress > fadeTo) { pauseModel(stop); return; }

    let t; /* envolvente de opacidad/blur — sube, se sostiene, baja */
    if (progress < focusAt)       t = (progress - from) / Math.max(0.001, focusAt - from);
    else if (progress < fadeFrom) t = 1;
    else                          t = 1 - (progress - fadeFrom) / Math.max(0.001, fadeTo - fadeFrom);
    t = Math.max(0, Math.min(1, t));

    /* Zoom dramático: crece en TODA la ventana [from, fadeTo], no se detiene
       cuando t llega a 1 — sigue "acercándose" hasta el final. */
    const zoomT = Math.max(0, Math.min(1, (progress - from) / Math.max(0.001, fadeTo - from)));

    /* Model CSS writes — these are compositor-only (opacity, blur, scale
       via CSS custom props) so they don't trigger layout. */
    canvas.style.setProperty('--model-opacity', String(t));
    canvas.style.setProperty('--model-blur',    ((1 - t) * 14) + 'px');
    canvas.style.setProperty('--model-scale',   String(0.7 + zoomT * 1.9));
    if (!stop.model.viewer && !stop.model.loading) loadModel(stop);
    if (stop.model.viewer) stop.model.viewer.setFocus(zoomT);
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

  /* ══════════════════════════════════════════════════════════
     AUTO-TRAVEL ENGINE — "magical scroll" UX
     ══════════════════════════════════════════════════════════

     Design intent: the user scrolls 1–3 small steps (wheel ticks
     or swipe nudges) and the narrative takes over — gliding
     smoothly and automatically to the next stop's focal point.
     The experience should feel like a cinematic cut guided by
     the user's intent, not a manual scrub.

     How it works:
     1. INTENT DETECTION: each wheel/touch event adds delta to a
        rolling accumulator. After INTENT_THRESHOLD px of input
        (roughly 1–3 wheel ticks), the engine considers the user's
        direction "declared" and takes over.

     2. AUTO-TRAVEL: the engine picks the nearest snap point (each
        stop has a focal progress value where the key content is
        centered) and drives window.scrollBy() toward it every rAF
        frame with an ease-out curve. The user feels the page
        "pull" toward the destination — smooth, slow, cinematic.

     3. RELEASE: once within ARRIVE_THRESHOLD px of the target,
        travel stops. The user can then scroll again (1–3 ticks)
        to declare intent toward the next stop.

     4. INTERRUPT: any new scroll input while traveling instantly
        resets the accumulator and re-evaluates direction — the
        user is always in control. Dragging the scrollbar bypasses
        the engine completely (it only fires on wheel/touch).

     Performance: all scroll math runs inside the existing rAF
     loop (updateParallax) — no second rAF loop, no setInterval.
     ══════════════════════════════════════════════════════════ */

  const INTENT_THRESHOLD  = 60;   /* px of wheel/touch delta before auto-travel fires (~2 wheel ticks) */
  const ARRIVE_THRESHOLD  = 6;    /* px from target — close enough to consider "arrived" */
  const TRAVEL_EASE       = 0.072; /* lerp factor per frame — lower = slower/smoother (0.05 dreamy, 0.12 snappy) */
  const INTENT_DECAY_MS   = 280;  /* ms of scroll silence before accumulator resets */

  /* Snap points: for each stop, the scroll position (px) where
     the focal content is centered on screen. Computed lazily
     after the DOM settles — stops have sticky frames so their
     offsetTop is stable after first paint. */
  function getSnapPoints() {
    return stopEls.map((stop, i) => {
      const stopTop  = stop.el.offsetTop;
      const stopSpan = stop.el.offsetHeight - window.innerHeight;
      /* Focal progress for each stop:
         - Stop 0 (city): 0.35 — model is entering focus
         - Stop 1 (studio): 0.4 — image is nicely zoomed
         Default: 0.38 — safe cinematic center */
      const focalProgress = [0.35, 0.40][i] ?? 0.38;
      return Math.round(stopTop + stopSpan * focalProgress);
    });
  }

  let snapPoints       = null; /* computed once on first scroll */
  let snapIndex        = 0;    /* which snap point we're currently at / heading to */
  let isTraveling      = false;
  let travelTarget     = 0;
  let intentAccum      = 0;    /* rolling delta accumulator */
  let lastIntentTime   = 0;
  let touchStartY      = 0;

  function declareTravelIntent(deltaY) {
    const now = Date.now();
    /* Decay accumulator if there's been a pause in scrolling */
    if (now - lastIntentTime > INTENT_DECAY_MS) intentAccum = 0;
    lastIntentTime = now;
    intentAccum   += deltaY;

    if (Math.abs(intentAccum) < INTENT_THRESHOLD) return; /* not enough intent yet */

    /* Intent declared — pick the target snap point */
    if (!snapPoints) snapPoints = getSnapPoints();
    const dir          = intentAccum > 0 ? 1 : -1;
    const currentY     = window.scrollY;
    intentAccum        = 0; /* reset for next gesture */

    /* Find the next snap point in the declared direction */
    let target = null;
    if (dir > 0) {
      /* scrolling DOWN — find next snap point below current position */
      for (let i = 0; i < snapPoints.length; i++) {
        if (snapPoints[i] > currentY + ARRIVE_THRESHOLD) {
          target    = snapPoints[i];
          snapIndex = i;
          break;
        }
      }
    } else {
      /* scrolling UP — find next snap point above current position */
      for (let i = snapPoints.length - 1; i >= 0; i--) {
        if (snapPoints[i] < currentY - ARRIVE_THRESHOLD) {
          target    = snapPoints[i];
          snapIndex = i;
          break;
        }
      }
    }

    if (target === null) return; /* already at first/last stop */

    isTraveling  = true;
    travelTarget = target;
    if (!rafId) rafId = requestAnimationFrame(travelTick);
  }

  function travelTick() {
    rafId = 0;
    updateParallax(); /* keep visual in sync */

    if (!isTraveling) return;

    const currentY = window.scrollY;
    const dist     = travelTarget - currentY;

    if (Math.abs(dist) < ARRIVE_THRESHOLD) {
      /* Arrived — snap exactly and stop */
      window.scrollTo({ top: travelTarget, behavior: 'instant' });
      isTraveling = false;
      return;
    }

    /* Ease-out lerp: moves fast when far, slows as it arrives */
    const step = dist * TRAVEL_EASE;
    window.scrollBy({ top: step, behavior: 'instant' });

    rafId = requestAnimationFrame(travelTick);
  }

  /* Wheel: intercept delta, let engine decide */
  window.addEventListener('wheel', e => {
    if (document.hidden) return;
    /* Allow native scroll to keep the page position updating —
       the engine adds extra travel on top via scrollBy().
       We only preventDefault if we want FULL takeover, but that
       breaks trackpad inertia. Instead we run alongside native scroll. */
    declareTravelIntent(e.deltaY);
    if (!rafId) rafId = requestAnimationFrame(updateParallax);
  }, { passive: true });

  /* Touch: accumulate swipe distance for mobile */
  window.addEventListener('touchstart', e => {
    touchStartY  = e.touches[0].clientY;
    intentAccum  = 0;
  }, { passive: true });

  window.addEventListener('touchmove', e => {
    if (document.hidden) return;
    const delta = touchStartY - e.touches[0].clientY;
    touchStartY  = e.touches[0].clientY;
    declareTravelIntent(delta);
    if (!rafId) rafId = requestAnimationFrame(updateParallax);
  }, { passive: true });

  /* Native scroll fallback (keyboard arrows, scrollbar drag, programmatic) */
  function onScroll() {
    if (document.hidden) return;
    /* If a drag/keyboard scroll happens while traveling, abort travel
       so the user stays in control */
    if (isTraveling) {
      isTraveling = false;
      intentAccum = 0;
    }
    if (!rafId) rafId = requestAnimationFrame(updateParallax);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });

  /* Recompute snap points on resize (stop heights change) */
  window.addEventListener('resize', () => { snapPoints = null; }, { passive: true });

  updateParallax(); /* initial paint */
})();

/* ══════════════════════════════════════════════════════════
   initModelViewer — motor tres.js aislado, un módulo por <canvas>.
   Carga perezosa (import dinámico, sólo cuando el scroll lo necesita),
   pixelRatio limitado, y render sólo bajo demanda (pause/resume) —
   nunca un requestAnimationFrame infinito, la lección de esta sesión.
   ══════════════════════════════════════════════════════════ */
function initModelViewer(container, glbSrc) {
  const threeUrl = new URL('./scroll/three.module.js', window.location.href);
  /* GLTFLoader.js (repo oficial) importa internamente
     '../utils/BufferGeometryUtils.js' y '../utils/SkeletonUtils.js' —
     rutas relativas a SU PROPIA ubicación. Por eso debe vivir dentro de
     ./scroll/loaders/, con ./scroll/utils/ como hermano, igual que en
     el repo (examples/jsm/loaders/ + examples/jsm/utils/). */
  const gltfLoaderUrl = new URL('./scroll/loaders/GLTFLoader.js', window.location.href);
  /* DRACOLoader: mismo tipo de archivo que GLTFLoader (repo oficial,
     examples/jsm/loaders/), así que vive en la misma carpeta ./scroll/loaders/.
     A diferencia de GLTFLoader, no importa nada de ../utils/ — no necesita
     nada más además de sí mismo. */
  const dracoLoaderUrl = new URL('./scroll/loaders/DRACOLoader.js', window.location.href);

  return Promise.all([
    import(threeUrl.href),
    import(gltfLoaderUrl.href),
    import(dracoLoaderUrl.href),
  ]).then(([THREE_MODULE, { GLTFLoader }, { DRACOLoader }]) => {
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

    /* Iluminación de 5 puntos — diseño warm-environment:
       - Hemisferio: boosted desde 0.55 → 1.1 para un suelo de luz ambiente
         más cálido. Elimina las sombras duras en zonas no iluminadas.
       - Front fill (NUEVO): luz direccional cálida fija, apuntando directo
         desde la cámara hacia el modelo. No orbita. Resuelve el problema de
         "elemento muy oscuro" — ilumina la cara frontal del modelo que el
         usuario ve todo el tiempo, independientemente del spinY del scroll.
       - Key cálida: boosted desde 2.6 → 3.2, mueve con el scroll (orbita).
       - Rim fría: separa la silueta del fondo oscuro, look cinemático.
       - Red (bonus): punto de luz rojo que crece con el scroll focus. */
    scene.add(new THREE.HemisphereLight(0xfff5e8, 0x2a1830, 1.1)); /* boosted ambient */

    const fill = new THREE.DirectionalLight(0xffe8c8, 2.2); /* warm front fill — FIXED position, never orbits */
    fill.position.set(0, 0.5, 6); /* directly in front: z+ = toward camera, y+ = slight top */
    scene.add(fill);

    const key = new THREE.DirectionalLight(0xffdca8, 3.2); /* boosted key — orbits with scroll */
    key.position.set(2, 3, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x6fb2ff, 1.1);
    rim.position.set(-3, 1.5, -3);
    scene.add(rim);
    const red = new THREE.PointLight(0xff3a1a, 0, 10); /* slightly warmer red, wider radius */
    red.position.set(-2, -1, 2);
    scene.add(red);

    let model = null;
    let paused = true;
    let raf = 0;
    let spinY = 0, spinYTarget = 0;
    let lightAngle = 0, lightAngleTarget = 0;
    let redPower = 0, redPowerTarget = 0;
    let mouseTX = 0, mouseTY = 0, mouseX = 0, mouseY = 0;

    function onPointerMove(e) {
      mouseTX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseTY = (e.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true });

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
      mouseX += (mouseTX - mouseX) * 0.06;
      mouseY += (mouseTY - mouseY) * 0.06;
      spinY      += (spinYTarget      - spinY)      * 0.08;
      lightAngle += (lightAngleTarget - lightAngle) * 0.05;
      redPower   += (redPowerTarget   - redPower)   * 0.05;
      if (model) {
        model.rotation.y = spinY + mouseX * 0.8;
        model.rotation.x = mouseY * 0.10;
        model.rotation.z = mouseX * 0.05;
      }
      key.position.set(Math.cos(lightAngle) * 4, 3, Math.sin(lightAngle) * 4);
      rim.position.set(Math.cos(lightAngle + Math.PI) * 3, 1.5, Math.sin(lightAngle + Math.PI) * 3);
      red.position.set(Math.cos(lightAngle * 0.5) * 3, -1, Math.sin(lightAngle * 0.5) * 3);
      red.intensity = redPower * 4;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    function requestFrame() { if (!raf) raf = requestAnimationFrame(tick); }

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(new URL('./scroll/draco/', window.location.href).href);

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load(glbSrc, gltf => {
      model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      model.scale.setScalar(2.0 / maxDim);
      model.position.sub(center.multiplyScalar(2.0 / maxDim));
      scene.add(model);
      requestFrame();
    });

    return {
      setFocus(zoomT) {
        spinYTarget    = zoomT * Math.PI * 2;
        lightAngleTarget = zoomT * Math.PI * 2;
        redPowerTarget = zoomT;
        requestFrame();
      },
      pause()  { paused = true; },
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
      if (entry.isIntersecting) {
        contactSection.classList.add('is-active');
      } else {
        contactSection.classList.remove('is-active');
      }
    });
  }, { threshold: 0.2 });

  observer.observe(contactSection);
})();
