/* ══════════════════════════════════════════════════════════
   panels.js
   Sebastián Castillo Portfolio — v1.3.2

   Contenido:
     1. Glass card panel transitions   (showPanel / showDefault)
     2. oklch gradient mouse tracking  (initGradientTracking)
     3. Scroll hint auto-hide          (initScrollHint)
     4. Focus-trap utility             (createFocusTrap)
     5. Form validation helpers        (validateField, setFieldState, validateForm)
     6. Contact modal                  (initContactModal)
     7. More / visual-archive panel    (initMorePanel)

   Depends on: config.js (CONFIG), historyManager.js (HistoryManager)

   Milestone 3 (Performance Engineering) fixes applied — sections 1-3, 5:
     Section 1 — animationend timeout fallback + rapid-re-click guard
                 (see onTransitionEnd / `transitioning` flag).
     Section 2 — rAF loop now pauses while tab is hidden; pointermove
                 marked passive.
     Section 3 — reviewed, no changes needed (already correct).
     Section 4 — reviewed, no changes made. The one finding (repeated
                 getComputedStyle per Tab press) was an explicit
                 judgment call, not a clear-cut fix — cross-checked
                 against portfolio-panel.js's usage and the risk of
                 caching wrong (a trapped user unable to Tab to a
                 legitimately-visible field) outweighs the low cost
                 of not caching. Left as-is.
     Section 5 — setFieldState now recreates the error span on BOTH
                 the valid and invalid paths (was: only invalid),
                 fixing a real regression of the Milestone 1
                 aria-describedby fix that fired on every successful
                 field validation. Also fixed animationend listener
                 stacking on the shake animation (same pattern as
                 section 1). Recreated span now also carries
                 aria-live="polite" (was missing — a regression I
                 caught in review; the original Milestone 1 static
                 span had it).
     Section 6 — contactTrigger's Space-key handler now calls
                 preventDefault() (was likely also triggering a page
                 scroll, since it's a div[role=button] with none of a
                 real button's default key handling). Form submit now
                 guards against rapid duplicate submissions
                 (`submitting` flag) — same rapid-repeat-action
                 pattern as sections 1 and 5, here guarding an actual
                 network side-effect.
     Section 7 — the autoplaying (muted) Vimeo embed is now paused via
                 the Vimeo Player API when the panel closes, instead
                 of continuing to decode/render indefinitely in the
                 background. Player API script was already loaded in
                 index.html, so no new dependency was needed.
   All sections audited and implemented.
   ══════════════════════════════════════════════════════════ */


/* ══════════════════════════════════════════════
   1. Glass card panel transitions
   ══════════════════════════════════════════════ */
(function initCardPanels() {
  const defaultView = document.getElementById('defaultView');
  const btnPanel    = document.getElementById('btnPanel');
  const backBtn     = document.getElementById('backBtn');
  const actionBtn   = document.getElementById('actionBtn');
  if (!defaultView || !btnPanel || !backBtn || !actionBtn) return;

  /* Milestone 3 fixes:
     - TRANSITION_FALLBACK_MS: fadeIn/fadeOut run 0.35s (animations.css) —
       400ms gives a small buffer. If animationend doesn't fire for any
       reason (interrupted animation, reduced-motion edge case, etc.),
       this timeout runs the same completion logic instead of leaving
       the panel stuck mid-transition indefinitely.
     - `transitioning` guard: prevents rapid re-clicks (e.g. double-
       clicking actionBtn before its first transition completes) from
       attaching duplicate one-time animationend listeners. */
  const TRANSITION_FALLBACK_MS = 400;
  let transitioning = false;

  /* Runs `fn` exactly once — whichever of animationend / fallback
     timeout fires first — and cleans up the other. */
  function onTransitionEnd(el, fn) {
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(timeoutId);
      el.removeEventListener('animationend', onEnd);
      fn();
    }
    function onEnd() { finish(); }
    el.addEventListener('animationend', onEnd, { once: true });
    const timeoutId = setTimeout(finish, TRANSITION_FALLBACK_MS);
  }

  function showPanel() {
    if (transitioning) return;
    transitioning = true;
    defaultView.classList.add('fade-out');
    onTransitionEnd(defaultView, () => {
      defaultView.style.display = 'none';
      defaultView.classList.remove('fade-out');
      btnPanel.style.display    = 'flex';
      backBtn.style.display     = 'block';
      btnPanel.classList.add('fade-in');
      onTransitionEnd(btnPanel, () => {
        btnPanel.style.opacity = '1';
        btnPanel.classList.remove('fade-in');
        transitioning = false;
      });
    });

    /* [historyManager] Registrar btnPanel al abrirse.
       Back de Android llamará showDefault() en lugar de salir. */
    if (typeof HistoryManager !== 'undefined') {
      HistoryManager.register('btnPanel', showDefault);
    }
  }

  function showDefault() {
    if (transitioning) return;
    transitioning = true;
    btnPanel.classList.add('fade-out');
    onTransitionEnd(btnPanel, () => {
      btnPanel.style.display  = 'none';
      btnPanel.style.opacity  = '0';
      btnPanel.classList.remove('fade-out');
      backBtn.style.display   = 'none';
      defaultView.style.display = 'flex';
      defaultView.classList.add('fade-in');
      onTransitionEnd(defaultView, () => {
        defaultView.classList.remove('fade-in');
        transitioning = false;
      });
    });

    /* [historyManager] Desregistrar btnPanel al cerrarse manualmente
       (botón "← atrás" UI o cualquier vía distinta al Back del SO). */
    if (typeof HistoryManager !== 'undefined') {
      HistoryManager.unregister('btnPanel');
    }
  }

  actionBtn.addEventListener('click', e => { e.currentTarget.blur(); showPanel(); });
  backBtn.addEventListener('click',   e => { e.currentTarget.blur(); showDefault(); });
})();


/* ══════════════════════════════════════════════
   2. oklch gradient — mouse/touch tracking
   ══════════════════════════════════════════════ */
(function initGradientTracking() {
  const targets = [
    document.getElementById('moduleTitle'),
    document.querySelector('.contact-prompt'),
    document.querySelector('.contact-pill-label'),
    document.getElementById('cmodalTitle'),
  ].filter(Boolean);

  let targetX = 50, targetY = 50;
  let currentX = 50, currentY = 50;
  let rafId = 0;

  function lerp(a, b, t) { return a + (b - a) * t; }

  function tick() {
    /* Milestone 3 fix: pause while the tab is hidden instead of
       running this loop forever in the background — matches the
       pattern already established in asciiDrawer.js. */
    if (document.hidden) {
      rafId = 0;
      return;
    }
    currentX = lerp(currentX, targetX, CONFIG.GRADIENT_LERP);
    currentY = lerp(currentY, targetY, CONFIG.GRADIENT_LERP);
    const gx = currentX.toFixed(2) + '%';
    const gy = currentY.toFixed(2) + '%';
    targets.forEach(el => {
      el.style.setProperty('--gx', gx);
      el.style.setProperty('--gy', gy);
    });
    rafId = requestAnimationFrame(tick);
  }

  function update(clientX, clientY) {
    targetX = (clientX / window.innerWidth)  * 100;
    targetY = (clientY / window.innerHeight) * 100;
  }

  document.addEventListener('pointermove', e => update(e.clientX, e.clientY), { passive: true });
  document.addEventListener('touchmove',
    e => update(e.touches[0].clientX, e.touches[0].clientY),
    { passive: true }
  );

  /* Resume the loop when the tab becomes visible again — needed here
     (unlike asciiDrawer.js) since there's no other observer/trigger
     that would naturally restart it. */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !rafId) rafId = requestAnimationFrame(tick);
  });

  tick();
})();


/* ══════════════════════════════════════════════
   3. Scroll hint auto-hide
   ══════════════════════════════════════════════ */
(function initScrollHint() {
  const hint = document.getElementById('scrollHint');
  if (!hint) return;
  window.addEventListener('scroll', () => {
    hint.classList.toggle('hidden', window.scrollY > 55);
  }, { passive: true });
})();


/* ══════════════════════════════════════════════
   4. Focus-trap utility
   ══════════════════════════════════════════════ */
function createFocusTrap(containerEl) {
  const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  function getFocusable() {
    return Array.from(containerEl.querySelectorAll(FOCUSABLE))
                .filter(el => !el.closest('[hidden]') && getComputedStyle(el).display !== 'none');
  }

  function trap(e) {
    if (e.key !== 'Tab') return;
    const focusable = getFocusable();
    if (!focusable.length) { e.preventDefault(); return; }
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  }

  return {
    activate()   { containerEl.addEventListener('keydown', trap); },
    deactivate() { containerEl.removeEventListener('keydown', trap); },
    focusFirst() {
      const focusable = getFocusable();
      if (focusable.length) focusable[0].focus();
    },
  };
}


/* ══════════════════════════════════════════════
   5. Form validation helpers
   ══════════════════════════════════════════════ */
const VALIDATION = CONFIG.VALIDATION;

function validateField(input) {
  const name  = input.name;
  const value = input.value.trim();
  let error   = '';

  if (name === 'nombre') {
    if (!value)                                    error = 'El nombre es requerido.';
    else if (value.length < VALIDATION.NAME_MIN_LENGTH)
      error = `Mínimo ${VALIDATION.NAME_MIN_LENGTH} caracteres.`;
  } else if (name === 'email') {
    if (!value)                                    error = 'El email es requerido.';
    else if (!VALIDATION.EMAIL_REGEX.test(value))  error = 'Ingresa un email válido.';
  } else if (name === 'mensaje') {
    if (!value)                                    error = 'El mensaje es requerido.';
    else if (value.length < VALIDATION.MESSAGE_MIN_LENGTH)
      error = `Mínimo ${VALIDATION.MESSAGE_MIN_LENGTH} caracteres.`;
  }

  return error;
}

/* Mark a field valid or invalid with visual feedback */
function setFieldState(input, error) {
  const isInvalid = Boolean(error);
  input.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');

  const existingMsg = document.getElementById('err-' + input.name);
  if (existingMsg) existingMsg.remove();

  /* Milestone 3 fix (Finding A, High): the span is now recreated on
     BOTH paths, not just the invalid one. Previously, once a field
     validated successfully the span was deleted here and never
     rebuilt — leaving aria-describedby="err-*" (set statically in
     index.html, Milestone 1) pointing at a non-existent ID for the
     rest of the session. Since this runs on every successful blur/
     submit, that was the common case, not an edge case. */
  const msg = document.createElement('span');
  msg.id        = 'err-' + input.name;
  msg.className = 'sr-only input-error-msg';
  msg.setAttribute('aria-live', 'polite'); /* was missing — the original static span (index.html, Milestone 1) had this; without it, errors on fields validated more than once stop being announced to screen readers */
  input.insertAdjacentElement('afterend', msg);

  if (isInvalid) {
    input.classList.add('input--invalid');
    input.classList.remove('input--valid');

    /* Restart the shake animation visually every time (remove →
       forced reflow → re-add, same technique already used correctly
       in slideshow.js's applyAnim), but only attach ONE cleanup
       listener even if this fires repeatedly in quick succession
       while the field stays invalid (Milestone 3 fix, Finding D2 —
       same duplicate-listener-stacking pattern already fixed in
       section 1's showPanel/showDefault). */
    input.classList.remove('input--shake');
    void input.offsetWidth;
    input.classList.add('input--shake');
    if (!input.dataset.shaking) {
      input.dataset.shaking = '1';
      input.addEventListener('animationend', () => {
        input.classList.remove('input--shake');
        delete input.dataset.shaking;
      }, { once: true });
    }

    msg.setAttribute('role', 'alert');
    msg.textContent = error;
  } else {
    input.classList.remove('input--invalid');
    input.classList.add('input--valid');
    /* msg stays empty — no role="alert"/text needed when there's no
       error to announce, but the element itself must still exist for
       aria-describedby to resolve to something. */
  }

  return !isInvalid;
}

/* Validate all form fields; returns true if all pass */
function validateForm(form) {
  const inputs = Array.from(form.querySelectorAll('.cmodal-input'));
  return inputs.reduce((allValid, input) => {
    const error = validateField(input);
    return setFieldState(input, error) && allValid;
  }, true);
}


/* ══════════════════════════════════════════════
   6. Contact modal
   ══════════════════════════════════════════════ */
(function initContactModal() {
  const wrap    = document.getElementById('contactModal');
  const overlay = document.getElementById('cmodalOverlay');
  const trigger = document.getElementById('contactTrigger');
  const closeBtn= document.getElementById('cmodalClose');
  const form    = document.getElementById('cmodalForm');
  const success = document.getElementById('cmodalSuccess');
  if (!wrap || !form) return;

  const trap = createFocusTrap(wrap);
  let previousFocus = null;
  let formOpenedAt  = 0; // timestamp set when modal opens, used for bot-timing check
  let submitting    = false; // Milestone 3 fix (Finding B): guards against rapid
    // duplicate submissions — same rapid-repeat-action pattern already fixed
    // in section 1 (transitioning) and section 5 (shake-listener dedup),
    // here guarding an actual network side-effect instead of a cosmetic one.

  /* Bots that fill+submit forms programmatically typically do it in well
     under a second; real humans take longer to read and type. Combined
     with the honeypot field below, this filters most naive spam without
     adding a CAPTCHA. Real protection still needs the matching check in
     Apps Script — see doc comment near CONFIG.FORM_ENDPOINT. */
  const MIN_HUMAN_FILL_MS = 1500;

  function isLikelyBot() {
    const honeypot = form.querySelector('[name="website"]');
    if (honeypot && honeypot.value.trim() !== '') return true;
    if (Date.now() - formOpenedAt < MIN_HUMAN_FILL_MS) return true;
    return false;
  }

  /* Live validation on blur */
  form.querySelectorAll('.cmodal-input').forEach(input => {
    input.addEventListener('blur', () => {
      if (input.value.trim()) {
        const error = validateField(input);
        setFieldState(input, error);
      }
    });
    input.addEventListener('input', () => {
      if (input.classList.contains('input--invalid')) {
        const error = validateField(input);
        setFieldState(input, error);
      }
    });
  });

  function open() {
    previousFocus = document.activeElement;
    formOpenedAt = Date.now();
    wrap.classList.add('open');
    wrap.removeAttribute('aria-hidden');
    document.documentElement.style.overflowY = 'hidden';
    trap.activate();
    requestAnimationFrame(() => { if (closeBtn) closeBtn.focus(); });

    /* [historyManager] Registrar contactModal al abrirse.
       Back de Android disparará shut() en lugar de salir. */
    if (typeof HistoryManager !== 'undefined') {
      HistoryManager.register('contactModal', shut);
    }
  }

  function shut() {
    wrap.classList.remove('open');
    wrap.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflowY = '';
    trap.deactivate();
    if (previousFocus) { previousFocus.focus(); previousFocus = null; }

    /* [historyManager] Desregistrar contactModal al cerrarse manualmente
       (botón ✕, clic en overlay, Escape, o cierre post-formulario). */
    if (typeof HistoryManager !== 'undefined') {
      HistoryManager.unregister('contactModal');
    }
  }

  if (trigger) {
    trigger.addEventListener('click',   open);
    trigger.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); /* Milestone 3 fix: without this, Space likely also
          scrolls the page — contactTrigger is a div[role=button], which has
          none of a real <button>'s default key handling built in. */
        open();
      }
    });
  }
  if (overlay)  overlay.addEventListener('click', shut);
  if (closeBtn) closeBtn.addEventListener('click', shut);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && wrap.classList.contains('open')) shut();
  });

  /* Form submit with validation */
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (submitting) return; /* Milestone 3 fix (Finding B) */
    submitting = true;

    /* Silently swallow likely-bot submissions: show the normal success
       state (so a bot/scraper gets no signal anything was rejected) but
       never actually send the request. */
    if (isLikelyBot()) {
      form.style.display    = 'none';
      success.style.display = 'block';
      setTimeout(shut, CONFIG.SUCCESS_DISPLAY_MS);
      submitting = false;
      return;
    }

    if (!validateForm(form)) {
      const firstInvalid = form.querySelector('.input--invalid');
      if (firstInvalid) firstInvalid.focus();
      submitting = false;
      return;
    }

    const formData = new FormData();
    formData.append('nombre',  form.nombre.value.trim());
    formData.append('email',   form.email.value.trim());
    formData.append('mensaje', form.mensaje.value.trim());
    /* Sent so Apps Script can re-validate server-side — never trust the
       client-side isLikelyBot() check alone, since anyone can call the
       endpoint directly with fetch and skip the JS entirely. */
    formData.append('website',  form.querySelector('[name="website"]').value);
    formData.append('elapsed',  String(Date.now() - formOpenedAt));

    try {
      await fetch(CONFIG.FORM_ENDPOINT, { method: 'POST', mode: 'no-cors', body: formData });
      submitting = false; /* Milestone 3 fix (Finding B) */

      form.style.display    = 'none';
      success.style.display = 'block';

      setTimeout(() => {
        shut();
        setTimeout(() => {
          form.style.display    = 'flex';
          success.style.display = 'none';
          form.reset();
          form.querySelectorAll('.cmodal-input').forEach(input => {
            input.classList.remove('input--invalid', 'input--valid');
            input.removeAttribute('aria-invalid');
          });
        }, CONFIG.MODAL_RESET_DELAY_MS);
      }, CONFIG.SUCCESS_DISPLAY_MS);

    } catch (err) {
      submitting = false; /* Milestone 3 fix (Finding B) */
      console.error('[contact form]', err);
      const errBanner = document.createElement('p');
      errBanner.setAttribute('role', 'alert');
      errBanner.className   = 'cmodal-send-error';
      errBanner.textContent = 'Error al enviar. Intenta de nuevo.';
      form.appendChild(errBanner);
      setTimeout(() => errBanner.remove(), 4000);
    }
  });
})();


/* ══════════════════════════════════════════════
   7. More / visual-archive panel
   ══════════════════════════════════════════════ */
(function initMorePanel() {
  const trigger  = document.getElementById('moreTrigger');
  const panel    = document.getElementById('morePanel');
  const closeBtn = document.getElementById('moreClose');
  if (!trigger || !panel) return;

  const trap = createFocusTrap(panel);
  let vimeoLoaded   = false;
  let vimeoPlayer   = null; /* Milestone 3 fix (Finding C) */
  let previousFocus = null;

  function openPanel() {
    previousFocus = document.activeElement;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('more-open');
    trap.activate();
    requestAnimationFrame(() => { if (closeBtn) closeBtn.focus(); });

    /* Lazy-load Vimeo iframe first time */
    if (!vimeoLoaded) {
      vimeoLoaded = true;
      const wrap = document.getElementById('feedVimeoWrap');
      if (wrap) {
        const iframe = document.createElement('iframe');
        iframe.src            = CONFIG.VIMEO_SRC;
        iframe.frameBorder    = '0';
        iframe.allow          = 'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share';
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.style.cssText  = 'position:absolute;top:0;left:0;width:100%;height:100%;';
        iframe.title          = CONFIG.VIMEO_TITLE;
        wrap.appendChild(iframe);

        /* Milestone 3 fix (Finding C): without this, the muted
           autoplay video keeps decoding/rendering in the background
           indefinitely once the panel is closed — no audio leak
           (muted=1 in CONFIG.VIMEO_SRC) but real, avoidable CPU/GPU
           cost. Player API script is already loaded in index.html. */
        if (typeof Vimeo !== 'undefined') {
          vimeoPlayer = new Vimeo.Player(iframe);
        }
      }
    } else if (vimeoPlayer) {
      vimeoPlayer.play().catch(() => {}); /* resume on reopen; ignore autoplay-policy rejections */
    }

    /* [historyManager] Registrar morePanel al abrirse.
       Back de Android llamará closePanel() en lugar de salir. */
    if (typeof HistoryManager !== 'undefined') {
      HistoryManager.register('morePanel', closePanel);
    }
  }

  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('more-open');
    trap.deactivate();
    if (previousFocus) { previousFocus.focus(); previousFocus = null; }
    if (vimeoPlayer) vimeoPlayer.pause().catch(() => {}); /* Milestone 3 fix (Finding C) */

    /* [historyManager] Desregistrar morePanel al cerrarse manualmente
       (botón ✕, Escape, o toggle cuando estaba abierto). */
    if (typeof HistoryManager !== 'undefined') {
      HistoryManager.unregister('morePanel');
    }
  }

  function togglePanel() {
    panel.classList.contains('open') ? closePanel() : openPanel();
  }

  trigger.addEventListener('click', togglePanel);
  closeBtn?.addEventListener('click', closePanel);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
  });
})();
