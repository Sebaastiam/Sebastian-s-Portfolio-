# History Manager — API, integración y revisión

## Propósito

Intercepta el botón físico "Back" de Android (y el gesto equivalente en iOS /
navegadores móviles) para cerrar el panel o modal activo **en lugar de** navegar
fuera de la página.

## API pública

```js
HistoryManager.register(id, closeFn)
// Llamar CADA VEZ que se abre un panel/modal.
//   id      : string único del panel (ej. 'contactModal')
//   closeFn : función sin argumentos que cierra ese panel.

HistoryManager.unregister(id)
// Llamar CADA VEZ que se cierra un panel/modal por una vía distinta al Back físico.
// Elimina la entrada del stack sin disparar closeFn.
```

## Cómo funciona

- Stack interno LIFO: `{ id, closeFn }[]`.
- Cada `register()` empuja una entrada de historial con `pushState({ historyPanel:
  id }, '')`.
- El listener `popstate` (disparado por Back) extrae la capa superior del stack y
  llama a su `closeFn`.
- Si el stack está vacío, Back funciona con comportamiento normal del navegador.
- **Guard contra registro duplicado**: si el mismo `id` ya está en el stack (ej.
  doble-tap en móvil sobre el trigger antes de que el panel termine de abrir), no se
  empuja una segunda entrada de historial — se actualiza `closeFn` y se sale sin
  tocar el historial. Sin este guard, `_stack` e `history` quedarían desincronizados
  y el usuario tendría que presionar Back dos veces para salir.
- `unregister()` retrocede el historial (`history.go(-1)`) **solo si** la entrada
  eliminada era la más reciente (top del stack) — si hay capas superiores, ya
  gestionaron su propio `go(-1)` al cerrarse.

## Mapa de integración — quién registra qué

| `id` | Registrado por | `closeFn` |
|---|---|---|
| `btnPanel` | `panels.js` → `showPanel()` | `showDefault` |
| `contactModal` | `panels.js` → `initContactModal().open()` | `shut` |
| `morePanel` | `panels.js` → `initMorePanel().openPanel()` | `closePanel` |
| `portPanel` | `portfolio-panel.js` → `openPanel()` | `closePanel` |
| `room-{galleryId}` | `portfolio-panel.js` → `openRoom()` | `() => closeRoom(galleryId)` (closure) |
| `portLightbox` | `portfolio-panel.js` → `openLightbox()` | `closeLightbox` |

Todo overlay/panel del sitio que puede quedar "abierto" tiene su contraparte
registrada — no se encontró ningún panel sin manejador de Back durante esta revisión.

## Nota ya documentada en el propio código (no es un bug, es una decisión registrada)

Dentro del listener `popstate` hay un comentario explicando que se **intentó y
revirtió** un cross-check de validación de estado contra `e.state`:

> `e.state` en `popstate` refleja la entrada hacia la que se está navegando (el panel
> anterior, o `null`) — no la entrada que se está cerrando — así que comparar
> ingenuamente `e.state` contra `top.id` fallaría en el camino normal, no solo en
> desincronización. Una versión correcta necesitaría comparar contra
> `_stack[_stack.length - 2]` en su lugar. Quedó sin implementar, para no arriesgar el
> comportamiento central de "Back cierra panel".

Es una decisión de ingeniería deliberada y documentada, no un cabo suelto.

## Veredicto de esta revisión

**El archivo no requiere cambios funcionales.** La lógica del stack LIFO, el guard de
duplicados, y la sincronización `register`/`unregister` con `history.go(-1)` están
correctamente implementadas y consistentemente integradas por los 6 puntos de la
tabla de arriba — no se encontró ningún panel que abra sin registrar, ni ningún cierre
manual que olvide desregistrar.

**Único punto cosmético encontrado** (no funcional): el comentario de cabecera del
archivo dice `v1.3.2`, mientras que `config.js` (fuente única de verdad del versionado
del sitio) y `drag.js` ya están en `v1.4.0`. `historyManager.js` no referencia
`CONFIG.SITE_VERSION` en ningún lado — es solo el número en el comentario el que
quedó desactualizado. No lo cambié porque es puramente informativo y no afecta
comportamiento; avísame si quieres que lo actualice a `v1.4.0` para que quede
consistente con el resto del repo.
