/* ══════════════════════════════════════════════════════════
   scrollNarrative.js  v3.3.0
   Sebastián Castillo Portfolio
   Refactor — smooth inertia scroll engine (zero.university pattern)

   ARCHITECTURE:
   ─ Single rAF loop runs at 60fps while narrative is in viewport.
   ─ Scroll events only update a RAW target value — they never
     touch the DOM. The rAF loop lerps currentProgress toward
     targetProgress each frame, then writes CSS vars once per frame.
   ─ This decouples scroll event noise from visual output:
     even if 20 scroll events fire in one frame, the DOM is only
     written once, with a smoothed value. This is the exact pattern
     used by zero.university / Locomotive Scroll / Lenis.
   ─ Mobile (≤768px): module exits immediately — CSS also hides
     the narrative container. No observers, no rAF, zero cost.
   ─ 3D model z-index: set to 100 in JS (above all layer depths).
     Layer depths drive their own z-index values (depth=6 max config).
   ══════════════════════════════════════════════════════════ */

(function initScrollNarrative() {

  /* ── Mobile kill-switch — mirrors the CSS display:none ── */
  if (window.matchMedia('(max-width: 768px)').matches) return;

  const root = document.getElementById('scrollNarrative');
  if (!root || typeof SCROLL_NARRATIVE_CONFIG === 'undefined' || !SCROLL_NARRATIVE_CONFIG.length) return;

  /* ── Dolly zoom curve constants ── */
  const ZOOM_START      = 0.08;   /* brief static hold before zoom begins */
  const BLUR_START      = 0.52;   /* blur/fade starts here — nítido before this */
  const MAX_SCALE       = 2.8;    /* max zoom multiplier for depth-0 bg */
  const EXIT_BLUR_PX    = 24;     /* max blur at end of stop */
  const DEPTH_INTENSITY = 0.15;   /* additional zoom per depth unit */

  /* ── Inertia constants (zero.university pattern) ──
     LERP_FACTOR: how fast currentProgress chases targetProgress.
     0.06 = slow/cinematic, 0.12 = snappy. Keep below 0.15. */
  const LERP_FACTOR = 0.075;
  const ARRIVE_EPS  = 0.0003;  /* stop lerping when diff is imperceptible */

  const stopEls = [];

  /* ══════════════════════════════════
     DOM BUILD
  ══════════════════════════════════ */
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
        img.loading = i === 0 ? 'eager' : 'lazy';
        img.alt = '';
        bg.appendChild(img);
      }
    } else {
      bg.classList.add('narrative-stop__bg--placeholder');
    }
    frame.appendChild(bg);

    /* depth 0 = background reference */
    const visualRefs = [{ el: bg, depth: 0 }];

    /* Layers — z-index = depth value (max 6 per config) */
    (stop.layers || []).forEach((layer, li) => {
      const layerEl = document.createElement('div');
      layerEl.className = 'narrative-stop__layer';
      const depth = typeof layer.depth === 'number' ? layer.depth : li + 1;
      layerEl.style.zIndex = String(depth);
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

    /* Text / hero card */
    if (stop.isLastStop) {
      const heroMount = document.getElementById('glassModule');
      if (heroMount) {
        frame.appendChild(heroMount);
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

    /* 3D model canvas — z-index 100: guaranteed above all layer depths */
    let modelCanvas = null;
    if (stop.model && stop.model.src) {
      modelCanvas = document.createElement('div');
      modelCanvas.className = 'narrative-stop__model-canvas';
      modelCanvas.style.zIndex = '100';
      frame.appendChild(modelCanvas);
    }

    stopEl.appendChild(frame);
    root.appendChild(stopEl);
    stopEls.push({
      el: stopEl,
      frameEl: frame,
      visuals: visualRefs,
      isLastStop: Boolean(stop.isLastStop),
      inRange: false,
      /* Per-stop inertia state — each stop has its own lerped progress */
      currentProgress: 0,
      targetProgress: 0,
      model: stop.model
        ? { config: stop.model, canvas: modelCanvas, viewer: null, loading: false }
        : null
    });
  });

  /* ── Progress bar ── */
  const progressBar = document.createElement('div');
  progressBar.className = 'narrative-progress';
  progressBar.innerHTML = '<div class="narrative-progress__fill"></div>';
  document.body.appendChild(progressBar);
  const progressFill = progressBar.querySelector('.narrative-progress__fill');

  /* ── IntersectionObserver — marks which stops are near viewport ── */
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const stop = stopEls.find(s => s.el === entry.target);
      if (!stop) return;
      stop.inRange = entry.isIntersecting;
      const thr = stop.isLastStop ? 0.45 : 0.5;
      stop.el.classList.toggle(
        'is-active',
        entry.isIntersecting && entry.intersectionRatio >= thr
      );
    });
  }, { threshold: [0, 0.45, 0.5] });

  stopEls.forEach(s => io.observe(s.el));

  /* ══════════════════════════════════
     INERTIA ENGINE — the core of the smoothness
     Zero.university pattern:
       1. scroll event → compute raw targetProgress (instant, no DOM write)
       2. rAF loop → lerp currentProgress toward targetProgress
       3. rAF loop → write CSS vars once per frame with smoothed value
     Result: scroll input is decoupled from visual output. Even rapid
     wheel events produce silky output because the lerp acts as a
     low-pass filter on the noisy scroll signal.
  ══════════════════════════════════ */
  let rafId = 0;
  let needsRender = true; /* keeps loop alive while lerp hasn't settled */

  function computeRawProgress(stopEl) {
    const rect = stopEl.getBoundingClientRect();
    const span = rect.height - window.innerHeight;
    if (span <= 0) return 0;
    return Math.min(1, Math.max(0, -rect.top / span));
  }

  function writeStopVisuals(stop, progress) {
    const zoomP = progress <= ZOOM_START
      ? 0
      : (progress - ZOOM_START) / (1 - ZOOM_START);
    const blurP = progress <= BLUR_START
      ? 0
      : (progress - BLUR_START) / (1 - BLUR_START);
    const blur    = blurP * EXIT_BLUR_PX;
    const opacity = 1 - blurP;

    /* READ phase — collect all computed values first */
    const writes = stop.visuals.map(visual => {
      const dm    = 1 + visual.depth * DEPTH_INTENSITY;
      const scale = 1 + (MAX_SCALE - 1) * zoomP * dm;
      return { el: visual.el, scale, blur, opacity };
    });

    /* WRITE phase — apply all at once, no interleaved reads */
    writes.forEach(w => {
      w.el.style.setProperty('--scale',   String(w.scale));
      w.el.style.setProperty('--blur',    w.blur + 'px');
      w.el.style.setProperty('--opacity', String(w.opacity));
    });
  }

  function tick() {
    rafId = 0;
    let stillMoving = false;

    stopEls.forEach(stop => {
      if (!stop.inRange) {
        pauseModel(stop);
        return;
      }

      /* Update target from raw scroll position */
      stop.targetProgress = computeRawProgress(stop.el);

      /* Lerp current toward target — this IS the smoothness */
      const diff = stop.targetProgress - stop.currentProgress;
      if (Math.abs(diff) > ARRIVE_EPS) {
        stop.currentProgress += diff * LERP_FACTOR;
        stillMoving = true;
      } else {
        stop.currentProgress = stop.targetProgress;
      }

      writeStopVisuals(stop, stop.currentProgress);
      if (stop.model) updateModel(stop, stop.currentProgress);
    });

    /* Progress bar */
    const rootRect  = root.getBoundingClientRect();
    const rootTotal = rootRect.height - window.innerHeight;
    const rootDone  = rootTotal > 0
      ? Math.min(1, Math.max(0, -rootRect.top / rootTotal))
      : 0;
    progressFill.style.width = (rootDone * 100) + '%';

    /* Keep the loop alive while content is still moving */
    if (stillMoving || needsRender) {
      needsRender = false;
      rafId = requestAnimationFrame(tick);
    }
  }

  function scheduleRender() {
    needsRender = true;
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  /* Scroll: just schedule — no DOM work here */
  window.addEventListener('scroll', () => {
    if (!document.hidden) scheduleRender();
  }, { passive: true });

  document.addEventListener('scroll', () => {
    if (!document.hidden) scheduleRender();
  }, { capture: true, passive: true });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleRender();
  });

  /* Boot */
  scheduleRender();

  /* ══════════════════════════════════
     3D MODEL CONTROLLER
  ══════════════════════════════════ */
  function updateModel(stop, progress) {
    const { config, canvas } = stop.model;
    const from     = config.revealFrom  ?? 0.30;
    const focusAt  = config.revealTo    ?? 0.42;
    const fadeFrom = config.fadeOutFrom ?? 0.78;
    const fadeTo   = config.fadeOutTo   ?? 0.93;

    if (progress < from || progress > fadeTo) {
      pauseModel(stop);
      return;
    }

    /* Opacity envelope: rise → hold → fall */
    let t;
    if (progress < focusAt)       t = (progress - from)      / Math.max(0.001, focusAt - from);
    else if (progress < fadeFrom) t = 1;
    else                          t = 1 - (progress - fadeFrom) / Math.max(0.001, fadeTo - fadeFrom);
    t = Math.max(0, Math.min(1, t));

    /* Zoom: continuous across full window, independent of opacity */
    const zoomT = Math.max(0, Math.min(1, (progress - from) / Math.max(0.001, fadeTo - from)));

    canvas.style.setProperty('--model-opacity', String(t));
    canvas.style.setProperty('--model-blur',    ((1 - t) * 12) + 'px');
    canvas.style.setProperty('--model-scale',   String(0.72 + zoomT * 1.8));

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
})();

/* ══════════════════════════════════════════════════════════
   initModelViewer — Three.js isolated renderer
   Lazy-loaded only when scroll reaches the model window.
   Warm lighting: fixed front fill + orbiting key/rim.
   Render-on-demand only (pause/resume) — no idle rAF.
══════════════════════════════════════════════════════════ */
function initModelViewer(container, glbSrc) {
  const base          = window.location.href;
  const threeUrl      = new URL('./scroll/three.module.js',        base).href;
  const gltfLoaderUrl = new URL('./scroll/loaders/GLTFLoader.js',  base).href;
  const dracoLoaderUrl= new URL('./scroll/loaders/DRACOLoader.js', base).href;

  return Promise.all([
    import(threeUrl),
    import(gltfLoaderUrl),
    import(dracoLoaderUrl)
  ]).then(([THREE, { GLTFLoader }, { DRACOLoader }]) => {
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 4);

    /* 5-point warm lighting rig:
       - Hemisphere: warm sky / cool ground — natural ambient baseline
       - Front fill (FIXED, never orbits): warm directional from z+ —
         illuminates the face of the model the user always sees,
         eliminating the "too dark" issue regardless of spin angle
       - Key (warm, orbits with scroll): main dramatic light
       - Rim (cool, orbits opposite key): cinematic silhouette separation
       - Red point (intensity grows with scroll focus): accent depth */
    scene.add(new THREE.HemisphereLight(0xfff5e0, 0x2a1830, 1.2));

    const fill = new THREE.DirectionalLight(0xffe0b0, 2.4);
    fill.position.set(0, 0.8, 6); /* fixed — straight from camera POV */
    scene.add(fill);

    const key = new THREE.DirectionalLight(0xffd090, 3.0);
    key.position.set(2, 3, 4);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x80c0ff, 1.0);
    rim.position.set(-3, 1.5, -3);
    scene.add(rim);

    const red = new THREE.PointLight(0xff3a10, 0, 12);
    red.position.set(-2, -1, 2);
    scene.add(red);

    let model        = null;
    let paused       = true;
    let raf          = 0;
    let spinY        = 0, spinYTarget      = 0;
    let lightAngle   = 0, lightAngleTarget = 0;
    let redPower     = 0, redPowerTarget   = 0;
    let mouseX       = 0, mouseTX         = 0;
    let mouseY       = 0, mouseTY         = 0;

    window.addEventListener('pointermove', e => {
      mouseTX = (e.clientX / window.innerWidth)  * 2 - 1;
      mouseTY = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    function resize() {
      const w = container.clientWidth  || 300;
      const h = container.clientHeight || 300;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    function tick() {
      raf = 0;
      if (paused) return;

      mouseX += (mouseTX - mouseX) * 0.055;
      mouseY += (mouseTY - mouseY) * 0.055;
      spinY        += (spinYTarget      - spinY)        * 0.07;
      lightAngle   += (lightAngleTarget - lightAngle)   * 0.045;
      redPower     += (redPowerTarget   - redPower)     * 0.045;

      if (model) {
        model.rotation.y = spinY + mouseX * 0.75;
        model.rotation.x = mouseY * 0.10;
        model.rotation.z = mouseX * 0.04;
      }

      key.position.set(Math.cos(lightAngle) * 4,  3,   Math.sin(lightAngle) * 4);
      rim.position.set(Math.cos(lightAngle + Math.PI) * 3, 1.5, Math.sin(lightAngle + Math.PI) * 3);
      red.position.set(Math.cos(lightAngle * 0.5) * 3, -1, Math.sin(lightAngle * 0.5) * 3);
      red.intensity = redPower * 3.5;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    function requestFrame() { if (!raf) raf = requestAnimationFrame(tick); }

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(new URL('./scroll/draco/', base).href);

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load(glbSrc, gltf => {
      model = gltf.scene;
      const box    = new THREE.Box3().setFromObject(model);
      const size   = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      model.scale.setScalar(2.0 / maxDim);
      model.position.sub(center.multiplyScalar(2.0 / maxDim));
      scene.add(model);
      requestFrame();
    });

    return {
      setFocus(zoomT) {
        spinYTarget        = zoomT * Math.PI * 2;
        lightAngleTarget   = zoomT * Math.PI * 2;
        redPowerTarget     = zoomT;
        requestFrame();
      },
      pause()  { paused = true; },
      resume() { paused = false; requestFrame(); }
    };
  });
}

/* ── Contact section reveal ── */
(function initContactObserver() {
  const section = document.getElementById('contactSection');
  if (!section) return;
  new IntersectionObserver(entries => {
    section.classList.toggle('is-active', entries[0].isIntersecting);
  }, { threshold: 0.2 }).observe(section);
})();
