/* ══════════════════════════════════════════════════════════════
   historyManager.js — Gestor centralizado de historial
   Portfolio Sebastián Castillo — v1.3.2

   Propósito:
     Intercepta el botón físico "Back" de Android (y el gesto
     equivalente en iOS / navegadores móviles) para cerrar el
     panel o modal activo en lugar de navegar fuera de la página.

   API pública:
     HistoryManager.register(id, closeFn)
       — Llama esto CADA VEZ que abres un panel/modal.
         id      : string único del panel (ej. 'contactModal')
         closeFn : función sin argumentos que cierra ese panel.

     HistoryManager.unregister(id)
       — Llama esto CADA VEZ que cierras un panel/modal.
         Elimina la entrada del stack sin disparar closeFn.

   Cómo funciona:
     • Mantiene un stack LIFO de { id, closeFn }.
     • Cada register() empuja una entrada de history con
       state = { historyPanel: id } usando pushState().
     • El listener 'popstate' (disparado por Back) extrae la
       capa superior del stack y llama a su closeFn.
     • Si el stack está vacío, Back funciona normalmente
       (el navegador retrocede a la página anterior).
   ══════════════════════════════════════════════════════════════ */

const HistoryManager = (() => {
  'use strict';

  /* Stack interno: cada elemento es { id: string, closeFn: Function } */
  const _stack = [];

  /* ── register ────────────────────────────────────────────────
     Llámalo justo después de mostrar un panel/modal.
     Empuja una entrada al historial del navegador para que
     el botón Back tenga "algo a donde retroceder".
  ──────────────────────────────────────────────────────────── */
  function register(id, closeFn) {
    if (typeof id !== 'string' || typeof closeFn !== 'function') {
      console.warn('[HistoryManager] register() requiere (string, function). Recibió:', id, closeFn);
      return;
    }

    /* Empujar entrada al stack interno */
    _stack.push({ id, closeFn });

    /* Empujar estado al historial del navegador.
       El objeto state es pequeño para no saturar la memoria. */
    window.history.pushState({ historyPanel: id }, '');
  }

  /* ── unregister ──────────────────────────────────────────────
     Llámalo cuando el panel se cierra SIN que el usuario haya
     presionado Back (ej. botón ✕, clic en overlay, Escape).
     Elimina la capa del stack Y retrocede en el historial para
     mantener stack e historial sincronizados.
  ──────────────────────────────────────────────────────────── */
  function unregister(id) {
    const idx = _stackIndexOf(id);
    if (idx === -1) return; /* ya no está en el stack, nada que hacer */

    /* Eliminar del stack */
    _stack.splice(idx, 1);

    /* Retroceder en el historial para consumir el pushState
       que se hizo en register(), SOLO si la entrada era la
       última (la más reciente). Si hay capas superiores,
       esas ya gestionaron su propio go(-1) al cerrarse. */
    if (idx === _stack.length) {
      /* go(-1) dispara 'popstate', pero en ese momento ya
         eliminamos la entrada del stack, así que el handler
         no llamará closeFn de nuevo → sin doble-cierre. */
      window.history.go(-1);
    }
  }

  /* ── _stackIndexOf ───────────────────────────────────────── */
  function _stackIndexOf(id) {
    /* Busca de atrás hacia adelante: en caso de duplicados
       (poco probable) eliminamos siempre el más reciente. */
    for (let i = _stack.length - 1; i >= 0; i--) {
      if (_stack[i].id === id) return i;
    }
    return -1;
  }

  /* ── Listener principal 'popstate' ───────────────────────────
     Se dispara cuando:
       a) El usuario presiona Back físico / gesto de Android/iOS.
       b) window.history.go(-1) llamado desde unregister().

     En el caso (b) la entrada ya fue eliminada del stack,
     por lo que top === undefined y no se llama ningún closeFn.
  ──────────────────────────────────────────────────────────── */
  window.addEventListener('popstate', (e) => {
    const top = _stack[_stack.length - 1];

    if (!top) {
      /* Stack vacío → Back funciona con comportamiento normal.
         El navegador ya retrocedió; no hacemos nada más. */
      return;
    }

    /* Hay un panel registrado: cerrarlo en lugar de salir.
       1) Eliminar del stack ANTES de llamar closeFn para evitar
          que un unregister() interno intente otro go(-1). */
    _stack.pop();

    /* 2) Llamar a la función de cierre del panel. */
    try {
      top.closeFn();
    } catch (err) {
      console.error('[HistoryManager] Error en closeFn de "' + top.id + '":', err);
    }
  });

  /* ── API pública ─────────────────────────────────────────── */
  return { register, unregister };

})();
