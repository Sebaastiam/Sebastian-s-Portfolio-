# Performance — Engineering Pass v3.2, Milestone 3 (consolidado)

Este documento consolida los hallazgos y fixes de performance que estaban dispersos
como comentarios por todo el código (JS y CSS). Los "Findings" con letra (A, B, C...)
son los identificadores originales usados internamente durante la auditoría.

## Patrones recurrentes (aplicados en más de un archivo)

### 1. `document.hidden` como gate universal para loops infinitos

Todo `requestAnimationFrame` que corre en loop (no solo una animación puntual) debe
comprobar `document.hidden` antes de seguir programándose. Aplicado en:
`initGradientTracking` (`panels.js`), `asciiDrawer.js` (`isActive()`),
`photoWall.js` (combinado con `IntersectionObserver`), `scrollNarrative.js`
(`onScroll` corta temprano si `document.hidden`).

### 2. rAF-batching de scroll/pointer listeners

Nunca recalcular en cada evento de scroll/pointermove — acumular en una variable
"pending" y aplicar una sola vez por frame vía rAF. Aplicado en `drag.js`
(`pendingX`/`pendingY` + `applyPending`) y `scrollNarrative.js`
(`rafId` + `updateParallax`).

### 3. Guard contra doble-disparo / re-clic rápido

Mismo patrón repetido en distintos contextos:

- `panels.js` sección 1 (`transitioning` flag) — evita que un doble-clic en
  `actionBtn` dispare `showPanel()`/`showDefault()` dos veces mientras la primera
  transición sigue en curso.
- `panels.js` sección 5 (Finding D2, dedup de listener de shake) — solo un
  `animationend` listener por campo, aunque `setFieldState` se llame repetidas veces
  seguidas.
- `panels.js` sección 6 (Finding B, `submitting` flag) — evita envíos duplicados del
  formulario de contacto (aquí protege un side-effect de red real, no solo cosmético).

### 4. `animationend` + timeout de respaldo

`onTransitionEnd(el, fn)` en `panels.js` corre `fn` exactamente una vez, sea cual sea
el evento que dispare primero: `animationend` o un `setTimeout` de respaldo
(`TRANSITION_FALLBACK_MS = 400`, con animaciones de 0.35s + margen). Cubre el caso de
que `animationend` no dispare (animación interrumpida, edge case de reduced-motion).
El mismo patrón defensivo se repite en `loadScreen.js` (`hide()` con timeout de
respaldo de 500ms tras `animationend`).

### 5. `will-change` por toggle, nunca estático

Declarado explícitamente como principio de diseño en `photo-wall.css` y
`scroll-narrative.css`: `will-change` se activa/desactiva vía clase JS
(`.is-active`, `.is-paused`) mientras el elemento está realmente en pantalla, no
declarado sin condición en la hoja de estilos. Este es el fix directo a un error ya
cometido antes en `.bg-img` y `.port-grid-item img` (declarados `will-change:
transform` sin condición) — no se repite en los módulos nuevos.

### 6. Construcción DOM perezosa (lazy build)

`portfolio-panel.js`: antes, `init()` construía el lightbox + panel + grid + las 6
salas completas (58 imágenes) en cada carga de página, sin importar si el usuario
tocaba "GALERÍAS" o no. Ahora `init()` solo conecta el botón (barato); el resto
(`ensurePanelBuilt()`) se construye una única vez, perezosamente, en el primer clic.
Dentro de cada sala, las miniaturas tampoco se insertan hasta que esa sala específica
se abre por primera vez (`buildRoomThumbs`, guardado con `dataset.built`).

## Changelog por archivo

### `drag.js`
- rAF-batched writes de posición (ver patrón #2 arriba).
- Fix de fuga de estado en `pointercancel`: se limpia `isDragging`/listeners igual que
  en `pointerup`.

### `slideshow.js` (huérfano — ver `background-engine.md`)
- **Finding A**: `visibilitychange` podía llamar `startCycle()` directamente, saltando
  el gate de `boot()`/`started`/preload si la página cargaba en una pestaña en
  background y se activaba antes de que el preload (o su timeout) terminara. Ahora
  delega a `boot()` si el ciclo no ha arrancado aún.
- **Finding D2**: se intentó una optimización marginal (condicionar `applyAnim(0)` a
  `!document.hidden`) y se **revirtió** — habría dejado el slide 0 estático
  permanentemente en cargas con pestaña oculta, ya que nada más re-aplica la
  animación retroactivamente a ese slide.

### `panels.js` (todas las secciones auditadas e implementadas)
- **Sección 1**: `TRANSITION_FALLBACK_MS` + guard `transitioning` (ver patrones #3, #4).
- **Sección 2**: rAF loop pausa con pestaña oculta; `pointermove` marcado `passive`.
- **Sección 3**: revisada, sin cambios necesarios.
- **Sección 4** (focus-trap): revisada, sin cambios — el único finding (
  `getComputedStyle` repetido por cada Tab) fue un *judgment call* explícito, no un
  fix claro: cachear mal (usuario atrapado sin poder tabular a un campo legítimamente
  visible) pesa más que el costo bajo de no cachear.
- **Sección 5**: `setFieldState` ahora recrea el span de error en **ambos** caminos
  (válido e inválido) — antes solo en el inválido, lo que rompía
  `aria-describedby` en cada validación exitosa (regresión real del fix de
  Milestone 1). El span recreado también recupera `aria-live="polite"` (perdido en
  la regresión). Dedup del listener de shake (patrón #3).
- **Sección 6**: `preventDefault()` en Space sobre `contactTrigger` (evita scroll de
  página, ya que es un `div[role=button]` sin el manejo de teclas nativo de
  `<button>`). Guard `submitting` contra envíos duplicados (patrón #3).
- **Sección 7**: el iframe de Vimeo (autoplay mudo) ahora se pausa vía Vimeo Player
  API al cerrar el panel, en vez de seguir decodificando/renderizando indefinidamente
  en segundo plano.

### `asciiDrawer.js`
- FPS cap por dispositivo (45 desktop / 24 móvil).
- `MAX_SIMULTANEOUS: 12` en `CONFIG.ASCII` — cap defensivo de explosiones simultáneas.
- Desactivado por completo en móvil.
- `isActive()` combina `panel.classList.contains('open')` **y** `!document.hidden`.

### `portfolio-panel.js`
- Construcción perezosa de panel/salas/miniaturas (patrón #6).
- Carrusel 3D pausado cuando el panel está cerrado (`animation-play-state: paused`).
- Cursor custom: guard `pointer: coarse` — en touch, el elemento ni se crea (antes el
  rAF corría para siempre sin condición de salida, a diferencia de los demás loops
  del proyecto).
- Vimeo: en móvil se carga en pausa (`autoplay=0`) en vez de autoplay mudo — un
  iframe de Vimeo autoreproduciéndose sigue decodificando video en segundo plano
  incluso mudo, un costo real de CPU/GPU sumado a todo lo demás del panel (canvas
  ASCII, feed con muchas tarjetas).

## Fixes de performance en CSS (móvil, `@media (max-width: 768px)`)

| Archivo | Qué se reduce | Por qué |
|---|---|---|
| `components-main.css` | Filtro SVG + `backdrop-filter` del glass card → tinte plano | El filtro SVG casi nunca tiene aceleración GPU en Android; recalcularlo en cada frame de drag era el motivo #1 de caída de rendimiento al tocar la tarjeta |
| `components-main.css` | `drop-shadow()` animado del título → fijo sin animar | `drop-shadow` animado es de los filtros más caros; se recalculaba en cada frame, para siempre, sobre un elemento siempre visible |
| `portafolio-panel.css` | Aro RGB + glow del botón GALERÍAS → sin giro, sin blur | Vive dentro del glass card, siempre visible en modo hero-v2; el blur animado es particularmente caro en Android |
| `portafolio-panel.css` | `drop-shadow()` del título del panel portafolio → `none` | Se recalculaba en cada evento de scroll dentro del panel |
| `components-archive.css` | `#ascii-bg` → `display: none !important` | Canvas ASCII completo oculto en móvil |
| `components-archive.css` | Cascada de hover de `.feed-item` → `transition: none` en `(pointer: coarse)` | En touch no hay hover real; sin esto podía quedar "pegado" tras un tap hasta tocar otro lado, repintando sin que el usuario lo esté mirando |
| `base.css` | Mismo mecanismo del glass, reforzado con selector `html body` para ganar especificidad sobre `components-main.css` | Sin el prefijo extra, `components-main.css` (carga después) ganaría el empate de especificidad y anularía la reducción móvil en silencio |
