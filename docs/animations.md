# Animations — Catálogo de keyframes y sistemas dinámicos

## Ubicación canónica

`animations.css` es la casa documentada de **todos** los `@keyframes` del proyecto —
incluso los consumidos por selectores que viven en otros archivos (ej.
`.module-title`/`.module-desc` en `components-main.css` referencian
`warmYellowGlow`/`warmPurpleGlow`, definidos aquí). Esto no es un problema de
forward-reference: los `@keyframes` se resuelven por nombre sin importar el orden de
carga de archivos.

## Catálogo de `@keyframes`

| Nombre | Archivo | Uso |
|---|---|---|
| `panRight/panLeft/panUp/panDown/zoomIn/zoomOut` | `animations.css` | **Desactivado** — Ken Burns del slideshow legacy (ver `background-engine.md`) |
| `fadeOut` / `fadeIn` | `animations.css` | Transiciones de panel (glass card default↔botones, load screen) |
| `bounceIn` / `bounceOut` | `animations.css` | Rebote elástico (curva `matrix3d` manual) — hover/pop-in de tarjeta y botones |
| `scaleDown` | `animations.css` | Feedback de `:active` en tarjeta y botones |
| `hintBounce` | `animations.css` | Bob del ícono de scroll hint |
| `inputShake` | `animations.css` | Shake de campo de formulario inválido |
| `warmPurpleGlow` / `warmYellowGlow` | `animations.css` | Ciclo de color del título vía `@property --warm-glow[2]` |
| `portScrollHint` | `portafolio-panel.css` | Bob del hint de scroll dentro del panel portafolio |
| `galeriaSpinBorder` | `portafolio-panel.css` | Rotación del aro RGB del botón GALERÍAS, vía `@property --galeria-angle` |
| `carouselSpin` | `portafolio-panel.css` | Rotación del carrusel 3D, vía `@property --carousel-spin` |
| `photoWallScroll` | `photo-wall.css` | Marquee vertical del photo wall |
| `loadOrbPulse` | `loadScreen.css` | Pulso del orbe de carga |

## `@property` — por qué se usa

Varias animaciones registran su custom property con `@property` (sintaxis tipada,
`inherits`, valor inicial) en vez de usar una variable CSS sin tipar:

- `--warm-glow` / `--warm-glow2` (`syntax: '<color>'`) — permite interpolación de
  color suave entre keyframes.
- `--galeria-angle`, `--carousel-spin` (`syntax: '<angle>'`) — rotación continua sin
  saltos.
- `--port-gy` (`syntax: '<length-percentage>'`) — sin este registro, la transición
  `--port-gy 0.1s linear` del título del panel portafolio probablemente no podría
  interpolar (las custom properties sin registrar son no-interpolables por defecto).

## Tracking de puntero — gradiente oklch (`panels.js`, sección 2)

`initGradientTracking()` persigue el mouse/touch para animar `--gx`/`--gy` (posición
del centro del gradiente radial oklch) en 4 elementos: `#moduleTitle`,
`.contact-prompt`, `.contact-pill-label`, `#cmodalTitle`.

- Mecanismo: `lerp(current, target, CONFIG.GRADIENT_LERP)` en un loop de
  `requestAnimationFrame`, con `CONFIG.GRADIENT_LERP = 0.055`.
- **Desactivado por completo en móvil** (`matchMedia('(max-width: 768px)')` → return
  temprano) — no tiene sentido en touch (no hay hover persistente), y sin esta salida
  el rAF corría para siempre.
- El loop se pausa mientras `document.hidden` y se reanuda en `visibilitychange` —
  a diferencia de `asciiDrawer.js`, aquí no hay otro observer que lo reinicie solo,
  por eso el listener explícito.

## Cursor custom (`portfolio-panel.js`, sección 16)

Dos elementos (`#port-cursor-dot`, `#port-cursor-ring`) siguen el puntero dentro del
panel portafolio. El dot sigue 1:1; el ring usa `lerp(current, target, 0.12)` para un
efecto de "arrastre" suave detrás del dot real.

- Se crea condicionalmente: si `matchMedia('(pointer: coarse)')` coincide (touch), la
  función retorna antes de crear los elementos — en touch no existe hover persistente,
  así que el cursor custom ni se construye.
- Clase `.hovering` se activa vía delegación de eventos (`pointerover`/`pointerout`)
  sobre el selector `INTERACTIVE = 'button, a, [role="button"], .port-grid-item,
  .port-room-thumb'`, tanto dentro del panel como en las salas (montadas aparte en
  `document.body`).

## Carrusel 3D (`portfolio-panel.js` sección 14 + `portafolio-panel.css` sección 10)

Anillo de imágenes en 3D (`transform-style: preserve-3d`) que gira infinitamente con
`carouselSpin` (38s lineal). Cada imagen se posiciona con
`rotateY(calc(var(--i) * var(--slide-deg))) translateX(var(--img-tx)) rotateY(90deg)`,
donde `--slide-deg = 360deg / --total`.

- **Perf**: el carrusel vive dentro de `.port-panel`, que solo se traslada fuera de
  pantalla al cerrarse (no `display: none`) — sin la regla
  `.port-panel:not(.open) .port-carousel-ring { animation-play-state: paused; }`, la
  animación 3D infinita seguiría girando en segundo plano incluso con el panel
  cerrado, desde la primera apertura.

## `prefers-reduced-motion`

Cobertura parcial e inconsistente entre archivos — vale la pena una pasada dedicada:

- `animations.css`: pausa `.module-title`/`.module-desc` (glow animado) — **activo**.
- `scroll-narrative.css`: bloque completo de `prefers-reduced-motion` para
  `.narrative-stop__bg/__layer` y el hero card — **comentado/desactivado**.
- `loadScreen.css`: regla para pausar `.load-orb` — **comentada/desactivada**.
- `asciiDrawer.js` lee `reduceMotion` (`window.matchMedia('(prefers-reduced-motion:
  reduce)')`) pero la variable se declara y **no se usa** en ninguna condición visible
  del archivo — posible cabo suelto para retomar.
