/* ══════════════════════════════════════════════════════════
   portfolio-panel.js — Módulo Galería / Portafolio
   Sebastián Castillo Portfolio — v1.3.2

   Contenido:
     1.  Data GALLERIES[]             (covers + image arrays)
     2.  buildPanel()                 (DOM .port-panel)
     3.  buildLightbox()              (DOM .port-lightbox)
     4.  buildGridAndRooms()          (grid items + .port-gallery-room × N)
     5.  initZoomPan()                (pointer zoom-origin on grid items)
     6.  initGridReveal()             (IntersectionObserver fade-in)
     7.  openLightbox / closeLightbox (full-screen image viewer)
     8.  lbNavigate()                 (prev/next in lightbox)
     9.  initLightbox()               (wire lightbox buttons)
     10. openRoom / closeRoom         (gallery room open/close + historyManager)
     11. openPanel / closePanel       (main panel open/close + historyManager)
     12. wireEvents()                 (all delegated event listeners)
     13. wireGaleriasButton()         (find/style the GALERÍAS btn)
     14. initCarousel()               (3D ring carousel in header)
     15. initOklchScroll()            (scroll-driven oklch gradient)
     16. initCursor()                 (custom cursor dot + ring)
     17. init()                       (boot sequence)

   Depends on: config.js (CONFIG), panels.js (createFocusTrap),
               historyManager.js (HistoryManager)
   ══════════════════════════════════════════════════════════ */

(function initPortafolioPanel() {
  'use strict';

  /* ══════════════════════════════════════════════
     1. Data
     ══════════════════════════════════════════════ */
  const GALLERIES = [
    {
      id: 'g1',
      title: 'Archivo: Revelados 2017-2021/',
      cover: 'images/galeria1/2022-10-22(8).webp',
      images: [
        'images/galeria1/2022-10-22(8).webp',
        'images/galeria1/112.webp',
        'images/galeria1/2022-10-22(1).webp',
        'images/galeria1/4.webp',
        'images/galeria1/6NdMeJVsCO2eDBmicnL3lc.webp',
        'images/galeria1/2022-10-22(2).webp',
        'images/galeria1/1dWnaGyS3VUeQwFQa6tXkd.webp',
        'images/galeria1/bZe5NSAr9A3cQq3suRVYKd.webp',
        'images/galeria1/icIvrw7Dp9Ye6ejjwmPYwk.webp',
        'images/galeria1/li2Z0h7btmcf5FyTw0xHVK.webp',
        'images/galeria1/bzUOLBV4vGgcgF01hP1Qgv.webp',
        'images/galeria1/2022-10-22(4).webp',
        'images/galeria1/2022-10-22.webp',
      ],
    },
    {
      id: 'g2',
      title: 'Archivo: Revelados 2022-2026',
      cover: 'images/galeria2/DSC01268.webp',
      images: [
        'images/galeria2/IMG_20250615_112029.webp',
        'images/galeria2/DSC01268.webp',
        'images/galeria2/DSC00059.webp',
        'images/galeria2/DSC00207.webp',
        'images/galeria2/DSC00521.webp',
        'images/galeria2/DSC00536 (1).webp',
        'images/galeria2/DSC00269.webp',
        'images/galeria2/DSC00557.webp',
        'images/galeria2/DSC00569.webp',
        'images/galeria2/IMG_20251202_132749.webp',
        'images/galeria2/DSC00769.webp',
        'images/galeria2/DSC01236.webp',
        'images/galeria2/IMG_20221127_115528.webp',
        'images/galeria2/IMG_20260311_140934.webp',
      ],
    },
    {
      id: 'g3',
      title: 'Galería: Brands & Bands',
      cover: 'images/galeria3/ex11.webp',
      images: [
        'images/galeria3/ex11.webp',
        'images/galeria3/DSC00454.webp',
        'images/galeria3/DSC00434.webp',
        'images/galeria3/DSC00432.webp',
        'images/galeria3/DSC00444.webp',
        'images/galeria3/DSC00450.webp',
        'images/galeria3/DSC00455.webp',
      ],
    },
    {
      id: 'g4',
      title: 'Archivo: Sketch identity',
      cover: 'images/galeria4/20180227102555_IMG_2198.webp',
      images: [
        'images/galeria4/20180227102555_IMG_2198.webp',
        'images/galeria4/quality(80) (2).webp',
        'images/galeria4/IMG_20230525_153400167 (1).webp',
        'images/galeria4/bVHCbetN5wLeh0cVUhgzt7.webp',
        'images/galeria4/0Nz6ek9Fur3dpkrE3QICL4.webp',
        'images/galeria4/2022-10-22(10).webp',
        'images/galeria4/quality(80).webp',
        'images/galeria4/20240527_223035.webp',
        'images/galeria4/20180224013950_IMG_2165_2.webp',
        'images/galeria4/IMG_20220922_141343627~2.webp',
        'images/galeria4/2022-10-22(1).webp',
        'images/galeria4/2022-10-22(5).webp',
      ],
    },
    {
      id: 'g5',
      title: 'Anim and Comic',
      cover: 'images/galeria5/gW9fchNInN2d128WzzsamR.webp',
      images: [
        'images/galeria5/2022-10-10.webp',
        'images/galeria5/cJLLvXOzAZ2bm5HdOOAtcK.webp',
        'images/galeria5/gW9fchNInN2d128WzzsamR.webp',
        'images/galeria5/hMoxc77shs5eS42gnkl3xc.webp',
        'images/galeria5/quality(80)(1).webp',
        'images/galeria5/2022-10-22.webp',
        'images/galeria5/2022-10-22(1).webp',
        'images/galeria5/2022-10-22(2).webp',
        'images/galeria5/2022-10-22(1)(1).webp',
        'images/galeria5/IMG_20230305_083826~2.webp',
        'images/galeria5/IMG_20230305_082828~2.webp',
      ],
    },
    {
      id: 'g6',
      title: 'Trabajando/Coming soon',
      cover: 'images/galeria1/20180212221655_IMG_1918.webp',
      images: [
        'images/galeria1/20180212221655_IMG_1918.webp',
      ],
    },
  ];

  /* ══════════════════════════════════════════════
     2. Build panel
     ══════════════════════════════════════════════ */
  function buildPanel() {
    const panel = document.createElement('div');
    panel.className = 'port-panel';
    panel.id = 'portPanel';
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('aria-label', 'Panel de portafolio — galerías');

    panel.innerHTML = `
      <div class="port-panel-inner" id="portPanelInner">
        <header class="port-header" id="portHeader">
          <div class="port-header-stage">
            <h1 class="port-title" data-text="PORTAFOLIO">PORTAFOLIO</h1>
            <div class="port-carousel-wrap" aria-hidden="true">
              <div class="port-carousel-ring" id="portCarouselRing"></div>
            </div>
          </div>
          <p class="port-subtitle">Sebastián Castillo — Visual Archive</p>
          <div class="port-scroll-hint" aria-hidden="true">
            <span>scroll</span>
            <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
              <path d="M7 1v11M2 8l5 5 5-5" stroke="rgba(255,255,255,0.40)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </header>

        <section class="port-grid-section" id="portGridSection">
          <p class="port-grid-label">Selecciona una galería</p>
          <div class="port-grid" id="portGrid"></div>
        </section>
      </div>
    `;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'port-panel-close';
    closeBtn.id = 'portPanelClose';
    closeBtn.setAttribute('aria-label', 'Cerrar portafolio');
    closeBtn.innerHTML = '✕';
    panel.appendChild(closeBtn);

    document.body.appendChild(panel);
    return panel;
  }

  /* ══════════════════════════════════════════════
     3. Build lightbox (en body, fuera del panel)
     ══════════════════════════════════════════════ */
  function buildLightbox() {
    const lightbox = document.createElement('div');
    lightbox.className = 'port-lightbox';
    lightbox.id = 'portLightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.innerHTML = `
      <button class="port-lightbox-close" id="portLbClose" aria-label="Cerrar imagen">✕ cerrar</button>
      <button class="port-lightbox-nav prev" id="portLbPrev" aria-label="Anterior">‹</button>
      <img src="" alt="" id="portLbImg"/>
      <button class="port-lightbox-nav next" id="portLbNext" aria-label="Siguiente">›</button>
    `;
    document.body.appendChild(lightbox);
  }

  /* ══════════════════════════════════════════════
     4. Build grid + rooms
        Rooms → directamente en document.body.
        position:fixed en CSS → nunca dentro del
        containing block de .port-panel.

     PERF FIX: antes esta función insertaba las 58 imágenes de las 6
     galerías completas (6 salas position:fixed de pantalla completa)
     en el DOM de una sola vez, apenas cargaba la página — aunque el
     usuario nunca abriera el portafolio. Ahora solo se construye el
     "cascarón" de cada sala (header + contenedor vacío); las miniaturas
     de una galería se insertan recién la primera vez que esa sala en
     particular se abre (ver buildRoomThumbs + openRoom). Las 6 portadas
     del grid sí se mantienen aquí — son solo 6 imágenes y hacen falta
     desde que se abre el panel por primera vez.
     ══════════════════════════════════════════════ */
  function buildGridAndRooms(panel) {
    const grid = panel.querySelector('#portGrid');

    GALLERIES.forEach((gallery, idx) => {
      /* — Grid item — */
      const item = document.createElement('div');
      item.className = 'port-grid-item';
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `Abrir galería: ${gallery.title}`);
      item.dataset.galleryId = gallery.id;
      item.style.transitionDelay = `${0.05 + idx * 0.07}s`;
      item.innerHTML = `
        <img src="${gallery.cover}" alt="${gallery.title}" loading="lazy" decoding="async"/>
        <div class="port-grid-overlay">
          <span class="port-grid-title">${gallery.title}</span>
          <span class="port-grid-count">${gallery.images.length} imágenes</span>
        </div>
      `;
      grid.appendChild(item);

      /* — Room: solo el cascarón, sin miniaturas todavía — */
      const room = document.createElement('div');
      room.className = 'port-gallery-room';
      room.id = `room-${gallery.id}`;
      room.dataset.galleryIdx = String(idx);
      room.setAttribute('aria-label', `Galería: ${gallery.title}`);
      room.setAttribute('aria-hidden', 'true');

      room.innerHTML = `
        <header class="port-room-header">
          <div class="port-room-header-inner">
            <h2 class="port-room-title">${gallery.title}</h2>
            <button class="port-room-back" data-room="${gallery.id}" aria-label="Volver al menú de galerías">
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                <path d="M13 5H1M5 1L1 5l4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Volver</span>
            </button>
          </div>
        </header>
        <div class="port-room-grid" id="roomGrid-${gallery.id}"></div>
      `;

      document.body.appendChild(room);
    });
  }

  /* Inserta las miniaturas de UNA galería — la primera vez que su sala se
     abre, nunca antes. `dataset.built` evita reconstruirlas en aperturas
     posteriores de la misma sala. */
  function buildRoomThumbs(gallery, idx) {
    const grid = document.getElementById(`roomGrid-${gallery.id}`);
    if (!grid || grid.dataset.built) return;
    grid.dataset.built = '1';
    grid.innerHTML = gallery.images.map((src, i) => `
      <div class="port-room-thumb" data-index="${i}" data-gallery="${idx}" role="button" tabindex="0" aria-label="Ver imagen ${i + 1}">
        <img src="${src}" alt="Fotografía ${i + 1} de ${gallery.title}" loading="lazy" decoding="async"/>
      </div>
    `).join('');
  }

  /* ══════════════════════════════════════════════
     5. Zoom-pan (grid de selección)
     ══════════════════════════════════════════════ */
  function initZoomPan(panel) {
    panel.addEventListener('pointermove', e => {
      const item = e.target.closest('.port-grid-item');
      if (!item) return;
      const rect = item.getBoundingClientRect();
      item.style.setProperty('--zoom-ox', ((e.clientX - rect.left) / rect.width  * 100).toFixed(1) + '%');
      item.style.setProperty('--zoom-oy', ((e.clientY - rect.top)  / rect.height * 100).toFixed(1) + '%');
    });
  }

  /* ══════════════════════════════════════════════
     6. Grid reveal (IntersectionObserver)
     ══════════════════════════════════════════════ */
  function initGridReveal(panel) {
    const items = panel.querySelectorAll('.port-grid-item');
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.15 });
    items.forEach(item => io.observe(item));
  }

  /* ══════════════════════════════════════════════
     7. Lightbox open / close
     ══════════════════════════════════════════════ */
  let lbCurrentGallery = 0, lbCurrentIndex = 0;

  function openLightbox(galleryIdx, imageIdx) {
    const lb  = document.getElementById('portLightbox');
    const img = document.getElementById('portLbImg');
    lbCurrentGallery = galleryIdx;
    lbCurrentIndex   = imageIdx;
    img.src = GALLERIES[galleryIdx].images[imageIdx];
    img.alt = `Fotografía ${imageIdx + 1} de ${GALLERIES[galleryIdx].title}`;
    lb.classList.add('open');
    document.getElementById('portLbClose').focus();

    /* [historyManager] Registrar lightbox al abrirse.
       Back de Android llamará closeLightbox() en lugar de salir. */
    if (typeof HistoryManager !== 'undefined') {
      HistoryManager.register('portLightbox', closeLightbox);
    }
  }

  function closeLightbox() {
    document.getElementById('portLightbox').classList.remove('open');

    /* [historyManager] Desregistrar lightbox al cerrarse manualmente
       (botón ✕, clic en overlay, Escape, o navegación). */
    if (typeof HistoryManager !== 'undefined') {
      HistoryManager.unregister('portLightbox');
    }
  }

  /* ══════════════════════════════════════════════
     8. Lightbox navigation
     ══════════════════════════════════════════════ */
  function lbNavigate(dir) {
    const gallery = GALLERIES[lbCurrentGallery];
    lbCurrentIndex = (lbCurrentIndex + dir + gallery.images.length) % gallery.images.length;
    const img = document.getElementById('portLbImg');
    img.style.opacity = '0';
    setTimeout(() => {
      img.src = gallery.images[lbCurrentIndex];
      img.alt = `Fotografía ${lbCurrentIndex + 1} de ${gallery.title}`;
      img.style.opacity = '1';
    }, 140);
  }

  /* ══════════════════════════════════════════════
     9. Init lightbox buttons
     ══════════════════════════════════════════════ */
  function initLightbox() {
    document.getElementById('portLbClose').addEventListener('click', closeLightbox);
    document.getElementById('portLbPrev').addEventListener('click', () => lbNavigate(-1));
    document.getElementById('portLbNext').addEventListener('click', () => lbNavigate(+1));
    document.getElementById('portLightbox').addEventListener('click', e => {
      if (e.target === document.getElementById('portLightbox')) closeLightbox();
    });
  }

  /* ══════════════════════════════════════════════
     10. Room open / close
     ══════════════════════════════════════════════ */
  function openRoom(galleryId) {
    /* Cerrar cualquier sala abierta primero */
    document.querySelectorAll('.port-gallery-room.open').forEach(r => {
      r.classList.remove('open');
      r.setAttribute('aria-hidden', 'true');
    });

    const room = document.getElementById(`room-${galleryId}`);
    if (!room) return;

    const idx = Number(room.dataset.galleryIdx);
    if (GALLERIES[idx]) buildRoomThumbs(GALLERIES[idx], idx);

    room.scrollTop = 0;
    room.classList.add('open');
    room.setAttribute('aria-hidden', 'false');

    const xBtn = document.getElementById('portPanelClose');
    if (xBtn) xBtn.classList.add('room-open');

    const back = room.querySelector('.port-room-back');
    if (back) back.focus();

    /* [historyManager] Registrar sala al abrirse.
       Back de Android llamará closeRoom(galleryId) en lugar de salir.
       La función anónima captura galleryId en su closure. */
    if (typeof HistoryManager !== 'undefined') {
      HistoryManager.register(`room-${galleryId}`, () => closeRoom(galleryId));
    }
  }

  function closeRoom(galleryId) {
    const room = document.getElementById(`room-${galleryId}`);
    if (!room) return;

    room.classList.remove('open');
    room.setAttribute('aria-hidden', 'true');

    const xBtn = document.getElementById('portPanelClose');
    if (xBtn) xBtn.classList.remove('room-open');

    /* Scroll del panel de vuelta a la sección de grid */
    const inner       = document.getElementById('portPanelInner');
    const gridSection = document.getElementById('portGridSection');
    if (inner && gridSection) {
      inner.scrollTo({ top: gridSection.offsetTop, behavior: 'smooth' });
    }

    setTimeout(() => {
      const gridItem = document.querySelector(`.port-grid-item[data-gallery-id="${galleryId}"]`);
      if (gridItem) gridItem.focus();
    }, 60);

    /* [historyManager] Desregistrar sala al cerrarse manualmente
       (botón Volver, Escape, o apertura de otra sala que llama closeRoom primero). */
    if (typeof HistoryManager !== 'undefined') {
      HistoryManager.unregister(`room-${galleryId}`);
    }
  }

  /* ══════════════════════════════════════════════
     11. Panel open / close
     ══════════════════════════════════════════════ */
  let panelPrevFocus = null, panelTrap = null;

  function openPanel() {
    const panel = document.getElementById('portPanel');
    if (!panel) return;
    panelPrevFocus = document.activeElement;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    document.getElementById('portPanelClose').classList.add('visible');

    if (!panel.dataset.panelInited) {
      panel.dataset.panelInited = '1';
      initCarousel(document.getElementById('portCarouselRing'));
      initGridReveal(panel);
      initZoomPan(panel);
      initOklchScroll(panel);
      initCursor(panel);
    }

    ['port-cursor-dot', 'port-cursor-ring'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('hidden');
    });

    panel.querySelectorAll('.port-grid-item:not(.visible)').forEach(el => el.classList.add('visible'));

    if (typeof createFocusTrap === 'function') {
      panelTrap = createFocusTrap(panel);
      panelTrap.activate();
    }

    requestAnimationFrame(() => {
      const inner = document.getElementById('portPanelInner');
      if (inner) inner.scrollTop = 0;
      document.getElementById('portPanelClose').focus();
    });

    /* [historyManager] Registrar portPanel al abrirse.
       Back de Android llamará closePanel() en lugar de salir. */
    if (typeof HistoryManager !== 'undefined') {
      HistoryManager.register('portPanel', closePanel);
    }
  }

  function closePanel() {
    const panel = document.getElementById('portPanel');
    if (!panel) return;

    /* Cerrar todas las salas en cascada (montadas en body) */
    document.querySelectorAll('.port-gallery-room.open').forEach(r => {
      /* [historyManager] Limpiar cada sala que se cierra en cascada */
      if (typeof HistoryManager !== 'undefined') {
        HistoryManager.unregister(r.id); /* r.id === 'room-gN' */
      }
      r.classList.remove('open');
      r.setAttribute('aria-hidden', 'true');
    });
    closeLightbox();

    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    document.getElementById('portPanelClose').classList.remove('visible');

    if (panelTrap) { panelTrap.deactivate(); panelTrap = null; }
    if (panelPrevFocus) { panelPrevFocus.focus(); panelPrevFocus = null; }

    ['port-cursor-dot', 'port-cursor-ring'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });

    /* [historyManager] Desregistrar portPanel al cerrarse manualmente
       (botón ✕, Escape, o cierre programático). */
    if (typeof HistoryManager !== 'undefined') {
      HistoryManager.unregister('portPanel');
    }
  }

  /* ══════════════════════════════════════════════
     12. Wire events (delegated)
     ══════════════════════════════════════════════ */
  function wireEvents(panel) {
    document.getElementById('portPanelClose').addEventListener('click', closePanel);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const lb = document.getElementById('portLightbox');
        if (lb && lb.classList.contains('open'))            { closeLightbox(); return; }
        const openRoomEl = document.querySelector('.port-gallery-room.open');
        if (openRoomEl) { closeRoom(openRoomEl.id.replace('room-', '')); return; }
        if (panel.classList.contains('open'))               { closePanel(); return; }
      }
      if (document.getElementById('portLightbox').classList.contains('open')) {
        if (e.key === 'ArrowLeft')  lbNavigate(-1);
        if (e.key === 'ArrowRight') lbNavigate(+1);
      }
    });

    /* Grid items → open room */
    panel.querySelectorAll('.port-grid-item').forEach(item => {
      const activate = () => openRoom(item.dataset.galleryId);
      item.addEventListener('click', activate);
      item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') activate(); });
    });

    /* Back buttons: rooms están en body, usar delegación en document */
    document.addEventListener('click', e => {
      const backBtn = e.target.closest('.port-room-back');
      if (backBtn) { e.stopPropagation(); closeRoom(backBtn.dataset.room); }
    });

    /* Room thumbs → lightbox */
    document.addEventListener('click', e => {
      const thumb = e.target.closest('.port-room-thumb');
      if (thumb) openLightbox(parseInt(thumb.dataset.gallery, 10), parseInt(thumb.dataset.index, 10));
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const thumb = e.target.closest('.port-room-thumb');
      if (thumb) { e.preventDefault(); openLightbox(parseInt(thumb.dataset.gallery, 10), parseInt(thumb.dataset.index, 10)); }
    });

    initLightbox();
  }

   /* ══════════════════════════════════════════════
     13. Wire GALERÍAS button
     ══════════════════════════════════════════════ */
  function wireGaleriasButton() {
    let btn = document.getElementById('galeriasBtn');
    if (!btn) {
      const btnPanel = document.getElementById('btnPanel');
      if (!btnPanel) return;
      const allBtns = btnPanel.querySelectorAll('.module-btn');
      btn = allBtns[allBtns.length - 1];
      if (!btn) return;
      btn.classList.add('module-btn--galeria');
      btn.textContent = 'GALERÍAS';
      btn.removeAttribute('href');
      btn.setAttribute('role', 'button');
      btn.setAttribute('aria-label', 'Abrir portafolio y galerías');
    }

    if (!btn.querySelector('.galeria-glow')) {
      const glowSpan = document.createElement('span');
      glowSpan.className = 'galeria-glow';
      glowSpan.setAttribute('aria-hidden', 'true');
      btn.style.position = 'relative';
      btn.appendChild(glowSpan);
    }

    btn.addEventListener('click', e => { e.preventDefault(); ensurePanelBuilt(); openPanel(); });
  }
  /* ══════════════════════════════════════════════
     14. 3D Ring Carousel
     ══════════════════════════════════════════════ */
  const CAROUSEL_IMGS = GALLERIES.map(g => g.cover);

  function initCarousel(ring) {
    if (!ring) return;
    ring.style.setProperty('--total', CAROUSEL_IMGS.length);
    CAROUSEL_IMGS.forEach((src, i) => {
      const img = document.createElement('img');
      img.src     = src;
      img.alt     = GALLERIES[i].title;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.style.setProperty('--i', i);
      ring.appendChild(img);
    });
  }

  /* ══════════════════════════════════════════════
     15. oklch scroll gradient
     ══════════════════════════════════════════════ */
  function initOklchScroll(panel) {
    const title = panel.querySelector('.port-title');
    if (!title) return;
    if (CSS.supports('color', 'oklch(0.5 0.2 200)')) title.classList.add('port-title--gradient');

    const inner = panel.querySelector('.port-panel-inner');
    if (!inner) return;

    function onScroll() {
      const pct = Math.min(inner.scrollTop / (panel.querySelector('.port-header')?.offsetHeight || window.innerHeight), 1);
      title.style.setProperty('--port-gy', `${140 - pct * 180}vh`);
    }
    inner.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  /* ══════════════════════════════════════════════
     16. Custom cursor
     ══════════════════════════════════════════════ */
  function initCursor(panel) {
    /* MOBILE PERF FIX: un cursor personalizado no tiene sentido en touch (no hay
       hover persistente), y CSS ya lo oculta con @media (pointer: coarse) en
       portafolio-panel.css — pero el requestAnimationFrame de abajo no tenía
       ninguna condición de salida (a diferencia de los otros loops del proyecto,
       que sí respetan document.hidden). En Android corría para siempre, moviendo
       elementos invisibles. Con este guard, en móvil ni siquiera se crea. */
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (document.getElementById('port-cursor-dot')) return;

    const dot = document.createElement('div');
    dot.id = 'port-cursor-dot';
    dot.classList.add('hidden');
    dot.style.cssText = 'pointer-events:none;position:fixed;';
    document.body.appendChild(dot);

    const ring = document.createElement('div');
    ring.id = 'port-cursor-ring';
    ring.classList.add('hidden');
    ring.style.cssText = 'pointer-events:none;position:fixed;';
    document.body.appendChild(ring);

    let rx = 0, ry = 0, tx = 0, ty = 0;
    const lerp = (a, b, t) => a + (b - a) * t;

    function tick() {
      rx = lerp(rx, tx, 0.12); ry = lerp(ry, ty, 0.12);
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    const INTERACTIVE = 'button, a, [role="button"], .port-grid-item, .port-room-thumb';

    function onMove(e) { tx = e.clientX; ty = e.clientY; dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; }
    function onOver(e) { if (e.target.closest(INTERACTIVE)) { dot.classList.add('hovering'); ring.classList.add('hovering'); } }
    function onOut(e)  { if (e.target.closest(INTERACTIVE)) { dot.classList.remove('hovering'); ring.classList.remove('hovering'); } }

    panel.addEventListener('pointermove',  onMove);
    panel.addEventListener('pointerover',  onOver);
    panel.addEventListener('pointerout',   onOut);
    panel.addEventListener('pointerleave', () => { dot.classList.add('hidden'); ring.classList.add('hidden'); });
    panel.addEventListener('pointerenter', () => { dot.classList.remove('hidden'); ring.classList.remove('hidden'); });

    /* También en las rooms (montadas en body) */
    document.addEventListener('pointermove', e => { if (e.target.closest('.port-gallery-room.open')) onMove(e); });
    document.addEventListener('pointerover',  e => { if (e.target.closest('.port-gallery-room.open')) onOver(e); });
    document.addEventListener('pointerout',   e => { if (e.target.closest('.port-gallery-room.open')) onOut(e); });
  }

  /* ══════════════════════════════════════════════
     17. Init

     PERF FIX: antes init() construía TODO (lightbox + panel + grid +
     las 6 salas) en cada carga de página, sin importar si el usuario
     llegaba a tocar "GALERÍAS" o no — compitiendo por el hilo principal
     justo con photo-wall/scroll-narrative/ascii en el arranque. Ahora
     solo se conecta el botón (barato: no toca imágenes); el resto se
     construye una única vez, perezosamente, en el primer clic.
     ══════════════════════════════════════════════ */
  let panelBuilt = false;
  function ensurePanelBuilt() {
    if (panelBuilt) return;
    panelBuilt = true;
    buildLightbox();
    const panel = buildPanel();
    buildGridAndRooms(panel);
    wireEvents(panel);
  }

  function init() {
    wireGaleriasButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
