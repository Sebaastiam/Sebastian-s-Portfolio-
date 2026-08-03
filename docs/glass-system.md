# Glass System — Liquid glass, tokens y botones

## Design tokens (`base.css :root`)

```css
/* Glass card shadow system */
--shadow-offset: 0;      --shadow-blur: 20px;
--shadow-spread: -5px;   --shadow-color: rgba(255,255,255,0.72);

/* Glass tint */
--tint-color: 200,220,255;   --tint-opacity: 0.22;   --frost-blur: 2px;

/* Shared card tokens */
--card-radius: 28px;
--card-shadow: …;         /* 4 capas de sombra apiladas */
--card-shadow-hover: …;   /* versión intensificada para :hover */
```

Estos tokens alimentan **todo** elemento "glass" del sitio: el `glassModule` (tarjeta
hero), `.module-btn` (botones), y — con la excepción documentada abajo — el modal de
contacto.

## El efecto glass: anatomía de 3 capas

`.glassModule` (y análogos) se construyen con 3 capas superpuestas:

1. **Elemento base** — layout, tamaño, posición, `cursor: grab`.
2. **`::before`** — capa de tinte: gradiente + `rgba(var(--tint-color), var(--tint-opacity))`
   + sombra interna (`--shadow-*`). Da el "color" del cristal.
3. **`::after`** — la distorsión real: `backdrop-filter: blur(var(--frost-blur))` +
   `filter: url(#glass-distortion)`, referenciando el filtro SVG declarado inline en
   `index.html`:

```svg
<filter id="glass-distortion">
  <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves="1" seed="9000" result="noise"/>
  <feGaussianBlur in="noise" stdDeviation="2" result="blurred"/>
  <feDisplacementMap in="SourceGraphic" in2="blurred" scale="77" xChannelSelector="R" yChannelSelector="G"/>
</filter>
```

Esto es lo que da la textura de "vidrio irregular" en vez de un blur plano.

## Variante móvil (perf)

En `@media (max-width: 768px)`, el filtro SVG casi nunca tiene aceleración GPU en
Android — se renderiza por software, y como el elemento es arrastrable, cada frame de
drag lo recalcula sobre toda el área de la tarjeta. Por eso en móvil:

- `filter` y `backdrop-filter` → `none`.
- Se sustituye por un `background: linear-gradient(...)` plano que imita el tinte sin
  el costo de recalcular una textura por frame.

Este mismo patrón (glass real en desktop, tinte plano en móvil) se repite en
`components-main.css` (`.glassModule::after`) y se refuerza en `base.css` sección 9
con selectores `html body .glassModule::after` — la especificidad extra es
**deliberada**, no decorativa: sin ese prefijo, `components-main.css` (que carga
después) ganaría el empate de especificidad y anularía silenciosamente la reducción
móvil.

## `.module-btn` — sistema de botones glass

Mismo lenguaje visual que la tarjeta, más ligero:

- Fondo: `linear-gradient(135deg, rgba(109,213,255,0.28), rgba(142,84,233,0.28))` +
  `backdrop-filter: blur(4px)`.
- Capa `::after` — una capa translúcida separada que anima con `bounceOut`/`bounceIn`
  al hacer pop-in / hover (ver `animations.md`).
- Estados: `:hover`/`:focus-visible` intensifican el gradiente y el letter-spacing;
  `:active` dispara `scaleDown`.

### Extensión `.module-btn--galeria`

El botón "GALERÍAS" hereda todo el sistema `.module-btn` pero añade:

- Tinte azul propio (`rgba(82,70,238,...)` / `rgba(21,179,190,...)`).
- **Aro RGB cónico** (`::before`) + **glow exterior** (`.galeria-glow`, hijo
  inyectado por JS) — ambos animan con `@property --galeria-angle` +
  `galeriaSpinBorder` (rotación infinita de 10s).
- En móvil: el giro y el `blur(22px)` del glow se congelan
  (`animation: none; --galeria-angle: 0deg;`) — mismo patrón de "queda visible, deja
  de costar" que el resto del proyecto.

## La excepción deliberada: `.cmodal-panel` (modal de contacto)

El modal de contacto **no** usa el sistema glass — es opaco a propósito:

```css
.cmodal-panel {
  background: linear-gradient(145deg, #261d2b, #161119);
  border: 1px solid oklch(0.72 0.18 18 / 0.58);
}
.cmodal-panel::before { content: none; }
.cmodal-panel::after  { content: none; }
```

`.cmodal-overlay` sí tenía `backdrop-filter` en un momento pero quedó en `none` en el
código actual (con una nota de "valor unificado" en `base.css` para la variante móvil
de 4px de blur). Vale la pena confirmar si esto es intencional o quedó a medio migrar.

## Capa de overrides: `hero-v2.css`

`hero-v2.css` es una capa de fixes sobre el glass card en modo "one-screen" (una sola
vista, sin toggle entre default/panel de botones):

- **Fix #1**: `#btnPanel` tenía `opacity: 0` por defecto (pensado para el toggle
  animado) — en `hero-v2` se fuerza `opacity: 1 !important` porque ambos bloques
  conviven siempre visibles.
- **Fix #2**: la tarjeta crece de alto (`clamp(399px, 70.3vh, 494px)`) para que quepan
  avatar + título + botones sin overflow, sin reducir el tamaño del título.
- **Fix #3**: `.glassModule.hero-v2:hover` reinstaura `bounceIn` en hover — sin esto,
  `.glassModule.hero-v2` y `.glassModule:hover` (`animations.css`) empataban en
  especificidad (0,2,0), y como `hero-v2.css` carga después, siempre ganaba y
  bloqueaba la animación de hover.

## Tokens retro-Windows (`--mw-*`)

Paleta completa de 21 variables (`--mw-desktop`, `--mw-win-face`, `--mw-pink`,
`--mw-cyan`, etc.) promovida a `base.css :root` en Milestone 2 — antes vivía
duplicada, byte a byte, en `.more-trigger` y `.more-panel`. Alimenta el panel
archivo/blog (`components-archive.css`) con su estética de ventanas 95/CRT.

## Tokens "Heat Wave" oklch (`--heat-stop-1..4`)

```css
--heat-stop-1: oklch(0.94 0.16 110);
--heat-stop-2: oklch(0.78 0.24 60);
--heat-stop-3: oklch(0.45 0.22 25);
--heat-stop-4: oklch(0.18 0.08 350 / 0);
```

Compartidos entre `.contact-prompt` (`components-main.css`), `.port-title--gradient`
(`portafolio-panel.css`) y el orbe de `#loadScreen .load-orb` — 3 consumidores sin
ancestro común, de ahí la promoción a `:root`.
