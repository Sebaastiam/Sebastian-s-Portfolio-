/* ══════════════════════════════════════════════════
   config.js — Centralised constants & endpoints
   Portfolio Sebastián Castillo — v2.0
   ══════════════════════════════════════════════════ */

const CONFIG = Object.freeze({

  /* ── Google Apps Script endpoint for contact form ── */
  FORM_ENDPOINT: 'https://script.google.com/macros/s/AKfycbxpnQ42VMCpVnSakwY-JplaqeSFsjRB4s1U6_eWmSoa2K1tV_7dpvUfFbNWsuXU3HqbcQ/exec',

  /* ── Slideshow ── */
  SLIDE_INTERVAL_MS: 4000,
  SLIDE_FALLBACK_MS: 2500,

  /* ── Ken Burns animation sequence (one entry per slide, in order) ── */
  SLIDE_ANIM_SEQ: ['panLeft', 'panUp', 'none', 'panUp', 'panRight', 'zoomOut', 'panRight', 'none'],

  /* ── Vimeo embed ── */
  VIMEO_SRC: 'https://player.vimeo.com/video/1200016508?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&muted=1',
  VIMEO_TITLE: 'LA ESCUELA NOCTURNA REMAKE',

  /* ── oklch gradient lerp speed ── */
  GRADIENT_LERP: 0.055,

  /* ── Contact modal success auto-close (ms) ── */
  SUCCESS_DISPLAY_MS: 2400,
  MODAL_RESET_DELAY_MS: 350,

  /* ── Form validation ── */
  VALIDATION: {
    NAME_MIN_LENGTH: 2,
    MESSAGE_MIN_LENGTH: 10,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  },

  /* ── ASCII drawer ── */
  ASCII: {
    CHAR_W: 7,
    CHAR_H: 12,
    MUTATION_INTERVAL_MS: 2500,
    BASE_STRING: 'ruZ_Esc',
    EXPLOSION_SPEED: 0.3,
    EXPLOSION_DECAY: 0.015,
    EXPLOSION_DENSITY: 0.25,
    TOTAL_STRINGS: 22,
  },

});
