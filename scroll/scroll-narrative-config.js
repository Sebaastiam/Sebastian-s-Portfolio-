/* ══════════════════════════════════════════════════════════
   scroll-narrative-config.js
   ══════════════════════════════════════════════════════════

   NUEVO: `scrollLength` (opcional, por parada) — override de --stop-height
   sólo para esa parada. Úsalo cuando una parada necesita más recorrido que
   las demás (como la primera acá: antes eran 2 paradas separadas, ahora
   es 1 sola alargada para dar espacio al modelo 3D al final).

   NUEVO: `model` (opcional, una sola vez, en la parada donde debe aparecer) —
     src:         ruta al .glb (motor tres.js vive en ./scroll/)
     revealFrom:  0..1, dónde empieza a asomar (borroso/lejano → foco)
     revealTo:    0..1, dónde ya está a foco/opacidad completa
     fadeOutFrom: 0..1, dónde empieza a desvanecer otra vez
     fadeOutTo:   0..1, dónde ya desapareció del todo
     El zoom (--model-scale) es continuo en TODO [revealFrom, fadeOutTo] —
     sigue acercándose aunque ya esté a opacidad 1. Fuera de esa ventana
     completa, el modelo no se renderiza (pausado) — cero costo.
   ══════════════════════════════════════════════════════════ */

window.SCROLL_NARRATIVE_CONFIG = [

  {
    header: 'Calles que caminé',
    description: '',
    scrollLength: '520vh', /* Extended: more scroll travel = slower, more cinematic dolly per wheel tick.
                              The auto-travel engine in scrollNarrative.js uses this space to glide
                              smoothly between the 1-3 manual scroll steps and the 3D model reveal. */
    background: { type: 'image', src: "./scroll/1.3.webp" },
    layers: [
      { src: "./scroll/1.2.webp", depth: 2 },  // far — distant skyline
      { src: "./scroll/1.1.webp", depth: 12 }, // mid — mid-ground rooftops
      { src: "./scroll/1.webp",   depth: 2 }, // near — foreground streetlamp/wire, zoom más intenso
    ],
    model: {
      src: './scroll/mushroom.glb',
      revealFrom:  0.08,  /* enters early — blur fades in quickly from the start */
      revealTo:    0.20,  /* reaches full focus fast, then STAYS visible for a long time */
      fadeOutFrom: 0.82,  /* holds at full opacity from 0.20 → 0.82 (62% of the stop) */
      fadeOutTo:   0.97,  /* graceful exit before the stop ends — leaves breathing room */
    },
  },
  {
    header: 'El estudio',
    description: '',
    background: { type: 'image', src: "./scroll/3.webp" },
    layers: [
      { src: "./scroll/3.1.webp", depth: 24 }, // far
    ],
  },
];
