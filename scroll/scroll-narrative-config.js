/* ══════════════════════════════════════════════════════════
   scroll-narrative-config.js
   Landing Redesign — Module 3 config file (EDIT THIS ONE for calibration)

   THIS IS THE FILE YOU'LL COME BACK TO once real PNG city layers
   exist. Nothing else in Module 3 needs to change for "calibration"
   — that word specifically means: swap `src` values, done.

   HOW A STOP WORKS:
   - header / description: the text shown for this stop
   - background: the solid base (a photo or video). Always depth 0 — the
     reference plane every layer's zoom is measured against.
   - layers: PNG images WITH TRANSPARENCY, stacked on top of the background.
     Each layer has an explicit `depth` (1 = closest to the background,
     higher = closer to camera). depth — NOT array position — decides both
     the stacking order (z-index) and how much extra zoom that layer gets
     as you scroll (see DEPTH_INTENSITY in scrollNarrative.js): a depth-3
     foreground layer visibly rushes toward camera faster than a depth-1
     background layer, simulating real parallax depth. You can list layers
     in any order in this array — depth is what matters, so reordering or
     inserting a new layer later never breaks the stacking.

   PLACEHOLDERS RIGHT NOW: every layer below has `src: null`. With
   no src, scrollNarrative.js auto-renders a labeled color-block
   stand-in instead of erroring — so the whole thing is fully
   testable today, with zero real images. The moment you have a
   real PNG, just fill in the src string. Nothing else changes.

   isLastStop: opcional en cualquier parada — si la agregas de vuelta (isLastStop: true),
   scrollNarrative.js reubica el hero card (#glassModule) dentro de esa parada. Ahora mismo
   NINGUNA parada la usa a propósito: el hero card y el botón de contacto se quedan donde
   ya viven en el landing original (fuera de este módulo), que es el comportamiento que
   preferimos — no hace falta una parada extra sólo para alojar la tarjeta.
   ══════════════════════════════════════════════════════════ */

window.SCROLL_NARRATIVE_CONFIG = [
   {
    header: 'Calles que caminé',
    description: '',
    background: { type: 'image', src: "./scroll/1.3.webp" }, // e.g. './images/narrative/stop1-bg.webp'
    layers: [
      { src: "./scroll/1.2.webp", depth: 2 }, // far — distant skyline
      { src: "./scroll/1.1.webp", depth: 12 }, // mid — mid-ground rooftops
      { src: "./scroll/1.webp", depth: 24 }, // near — foreground streetlamp/wire, zoom más intenso
    ],
  },
  {
    header: 'Bogotá, de noche',
    description: '',
    background: { type: 'image', src: "./scroll/2.webp" }, // e.g. './images/narrative/stop1-bg.webp'
    layers: [
      { src: "./scroll/2.1.webp", depth: 2 }, // far —
      { src: "./scroll/2.2.webp", depth: 6 }, // near — 
    ],
  },
  {
    header: 'El estudio',
    description: '',
   background: { type: 'image', src: "./scroll/3.webp" }, // e.g. './images/narrative/stop1-bg.webp'
    layers: [
      { src: "./scroll/3.1.webp", depth: 10 }, // far — 
    ],
  },
];