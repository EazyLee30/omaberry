/* OmaBerry Keys & Gestures Engine
 * BlackBerry Classic (Q20) input subsystem:
 * - Responsive 1-finger horizontal & vertical touch swiping
 * - 5 physical toolbelt buttons (Call, Menu, Trackpad, Back, End)
 * - Hardware QWERTY keyboard with transparent Alt (Number/Symbol) passthrough
 */

'use strict';

window.OB = window.OB || {};

window.OB.Keys = (function () {
  const K = window.OB.Kernel;

  const KEY_CODES = {
    BACKSPACE: 8,
    TAB: 9,
    ENTER: 13,
    SHIFT: 16,
    CTRL: 17,
    ALT: 18,
    ESCAPE: 27,
    SPACE: 32,
    PAGE_UP: 33,
    PAGE_DOWN: 34,
    END: 35,
    HOME: 36,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    CONTEXT_MENU: 93,
    CALL: 170,        // Green phone key
    END_CALL: 171,    // Red phone key
    VOLUME_UP: 175,
    VOLUME_DOWN: 174,
    VOLUME_MUTE: 173
  };

  const state = {
    altDown: false,
    shiftDown: false,
    ctrlDown: false,
    trackpadActive: false,
    touchStartX: 0,
    touchStartY: 0,
    touchStartTime: 0,
    isSwiping: false,
    swipeConsumed: false
  };

  const GESTURE_CONFIG = {
    minSwipeDist: 24,  // 24px quick flick on 720x720 3.5-inch screen
    maxSwipeTime: 800
  };

  /* ── Swipe Decision (shared by the touch and mouse paths) ─────────
   * QNX's content_shell reports a tap on the screen as a *mouse* event:
   * `ontouchstart` does not exist there, so a touch-only handler can never
   * fire and every gesture silently dies. Both paths therefore call these
   * three helpers rather than re-deriving the same rule.
   */
  function beginSwipe(x, y) {
    state.touchStartX = x;
    state.touchStartY = y;
    state.touchStartTime = Date.now();
    state.isSwiping = true;
    state.swipeConsumed = false;
  }

  function moveSwipe(x, y) {
    if (!state.isSwiping) return;
    const dx = x - state.touchStartX;
    const dy = y - state.touchStartY;
    // Past the threshold this is a drag, not a tap -- used to swallow the
    // click the browser still fires after a mouse swipe.
    if (!state.swipeConsumed &&
        Math.max(Math.abs(dx), Math.abs(dy)) >= GESTURE_CONFIG.minSwipeDist) {
      state.swipeConsumed = true;
    }
    K.emit('gesture:move', { dx: dx, dy: dy, x: x, y: y });
  }

  function endSwipe(x, y) {
    if (!state.isSwiping) return false;
    state.isSwiping = false;

    const duration = Date.now() - state.touchStartTime;
    if (duration > GESTURE_CONFIG.maxSwipeTime) return false;

    const dx = x - state.touchStartX;
    const dy = y - state.touchStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // 1. Horizontal swipe across workspaces (Left = Next, Right = Prev)
    if (absX >= GESTURE_CONFIG.minSwipeDist && absX > absY) {
      K.emit(dx < 0 ? 'action:workspace-next' : 'action:workspace-prev',
             { source: 'swipe' });
      return true;
    }

    // 2. Vertical swipe down from the upper screen -> Quick Controls
    if (dy >= GESTURE_CONFIG.minSwipeDist && dy > absX && state.touchStartY < 360) {
      K.emit('action:toggle-shade', { source: 'swipe-down' });
      return true;
    }

    // 3. Vertical swipe up -> close the shade / go back
    if (dy <= -GESTURE_CONFIG.minSwipeDist && absY > absX) {
      K.emit('action:back', { source: 'swipe-up' });
      return true;
    }
    return false;
  }

  function cancelSwipe() {
    state.isSwiping = false;
  }

  /* ── Responsive Swiping (Single Thumb / Finger) ──────────── */
  function initTouchGestures() {
    const hasTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    window.addEventListener('touchstart', function (e) {
      if (!e.touches || e.touches.length === 0) return;
      const t = e.touches[0];
      beginSwipe(t.clientX, t.clientY);
    }, { passive: true });

    window.addEventListener('touchmove', function (e) {
      if (!e.touches || e.touches.length === 0) return;
      const t = e.touches[0];
      moveSwipe(t.clientX, t.clientY);
    }, { passive: true });

    window.addEventListener('touchcancel', cancelSwipe, { passive: true });

    window.addEventListener('touchend', function (e) {
      const changed = e.changedTouches && e.changedTouches[0];
      if (!changed) return;
      if (endSwipe(changed.clientX, changed.clientY)) e.preventDefault();
    }, { passive: false });

    /* Mouse path -- the one that actually fires on the Q20 build. */
    window.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      if (hasTouch && state.isSwiping) return; // touch already owns this drag
      beginSwipe(e.clientX, e.clientY);
    }, true);

    window.addEventListener('mousemove', function (e) {
      if (!state.isSwiping) return;
      moveSwipe(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener('mouseup', function (e) {
      if (e.button !== 0) return;
      if (endSwipe(e.clientX, e.clientY)) {
        // The browser still emits `click` after this drag; cancel it so a
        // workspace swipe never also activates whatever was under the finger.
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    window.addEventListener('click', function (e) {
      if (!state.swipeConsumed) return;
      e.preventDefault();
      e.stopPropagation();
      state.swipeConsumed = false;
    }, true);
  }

  /* ── Physical Toolbelt Handler (5 Keys) ────────────────────────── */
  function handleToolbelt(e) {
    const key = e.key;
    const code = e.keyCode || e.which;

    // 1. Back Button (physical U-turn key)
    if (key === 'Escape' || key === 'Back' || key === 'BrowserBack' || code === KEY_CODES.ESCAPE || code === 4) {
      e.preventDefault();
      e.stopPropagation();
      K.emit('action:back', { key, code });
      return true;
    }

    // 2. Menu Button (BlackBerry logo key) -> Toggle App Launcher
    if (key === 'ContextMenu' || key === 'Menu' || code === KEY_CODES.CONTEXT_MENU) {
      e.preventDefault();
      e.stopPropagation();
      K.emit('action:menu', { key, code });
      return true;
    }

    // 3. Green Call Key -> open a terminal. Hyprland's Super+Return opens one
    //    on the current workspace and tiles it in; it does not jump to a
    //    workspace that happens to be reserved for terminals.
    if (key === 'Call' || code === KEY_CODES.CALL || key === 'F3') {
      e.preventDefault();
      e.stopPropagation();
      K.emit('action:open-app', { app: 'terminal' });
      return true;
    }

    // 4. Red End Key -> back to the desktop surface, leaving the shell running
    if (key === 'EndCall' || code === KEY_CODES.END_CALL || key === 'BrowserHome') {
      e.preventDefault();
      e.stopPropagation();
      K.emit('action:close-window', {});
      return true;
    }

    // 5. Optical Trackpad Center Click
    if (key === 'Select') {
      K.emit('action:trackpad-click', { target: e.target });
      return true;
    }

    return false;
  }

  /* ── Keyboard Shortcuts ────────────────────────────────────────── */
  function handleKeyboardShortcuts(e) {
    if (handleToolbelt(e)) {
      return;
    }

    const key = (e.key || '').toLowerCase();
    const code = e.keyCode || e.which;
    const currentFocus = K.getState('focus', 'desktop');
    const ws = K.getState('workspace', 0);

    // Alt chords. These are Omarchy's Super chords re-spelled for the Q20,
    // which has no Super key and whose Alt is a transparent passthrough.
    if (state.altDown && !state.ctrlDown) {
      const chords = {
        t: 'terminal', f: 'fileman', s: 'sysinfo', w: 'webhub', l: 'launcher'
      };
      if (chords[key]) {
        e.preventDefault();
        if (chords[key] === 'launcher') K.emit('action:toggle-launcher', {});
        else K.emit('action:open-app', { app: chords[key] });
        return;
      }
      switch (key) {
        case 'v': e.preventDefault(); K.emit('action:window-cycle', {}); return;
        case 'q': e.preventDefault(); K.emit('action:window-close', {}); return;
        case 'h': e.preventDefault(); K.emit('action:focus-left', {}); return;
        case 'l': e.preventDefault(); K.emit('action:focus-right', {}); return;
        case 'j': e.preventDefault(); K.emit('action:focus-down', {}); return;
        case 'k': e.preventDefault(); K.emit('action:focus-up', {}); return;
        case '1': case '2': case '3': case '4': case '5':
          e.preventDefault();
          K.emit('action:switch-workspace', { index: parseInt(key, 10) - 1 });
          return;
      }
    }

    // Launcher Modal
    if (currentFocus === 'launcher') {
      if (key === 'escape') {
        e.preventDefault();
        K.emit('action:close-launcher', {});
        return;
      }
      if (key === 'arrowdown' || code === KEY_CODES.DOWN) {
        e.preventDefault();
        K.emit('launcher:nav', { dir: 1 });
        return;
      }
      if (key === 'arrowup' || code === KEY_CODES.UP) {
        e.preventDefault();
        K.emit('launcher:nav', { dir: -1 });
        return;
      }
      if (key === 'enter' || code === KEY_CODES.ENTER) {
        e.preventDefault();
        K.emit('launcher:exec-selected', {});
        return;
      }
      return;
    }

    // File Manager
    if (currentFocus === 'fileman') {
      if (key === 'escape') {
        e.preventDefault();
        K.emit('action:switch-workspace', { index: 0 });
        return;
      }
      if (key === 'arrowdown' || key === 'j' || code === KEY_CODES.DOWN) {
        e.preventDefault();
        K.emit('fileman:nav', { dir: 1 });
        return;
      }
      if (key === 'arrowup' || key === 'k' || code === KEY_CODES.UP) {
        e.preventDefault();
        K.emit('fileman:nav', { dir: -1 });
        return;
      }
      if (key === 'enter' || code === KEY_CODES.ENTER) {
        e.preventDefault();
        K.emit('fileman:open-selected', {});
        return;
      }
      if (key === 'backspace' || code === KEY_CODES.BACKSPACE) {
        e.preventDefault();
        K.emit('fileman:up-dir', {});
        return;
      }
      return;
    }

    // When inside Terminal (Workspace 1), keep focus on input
    if (ws === 1) {
      const termInput = document.getElementById('term-input');
      if (termInput && document.activeElement !== termInput) {
        termInput.focus();
      }
    }
  }

  function initTrackpad() {
    window.addEventListener('wheel', function (e) {
      K.emit('trackpad:wheel', {
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        deltaZ: e.deltaZ
      });
    }, { passive: true });

    window.addEventListener('mousemove', function (e) {
      if (!state.trackpadActive) {
        state.trackpadActive = true;
        document.body.classList.add('trackpad-active');
      }
      K.emit('trackpad:move', { x: e.clientX, y: e.clientY });
    }, { passive: true });
  }

  function init() {
    initTouchGestures();
    initTrackpad();

    window.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      e.stopPropagation();
      K.emit('action:menu', { source: 'contextmenu' });
      return false;
    }, true);

    window.addEventListener('keydown', function (e) {
      if (e.keyCode === KEY_CODES.ALT) state.altDown = true;
      if (e.keyCode === KEY_CODES.SHIFT) state.shiftDown = true;
      if (e.keyCode === KEY_CODES.CTRL) state.ctrlDown = true;
      handleKeyboardShortcuts(e);
    }, false);

    window.addEventListener('keyup', function (e) {
      if (e.keyCode === KEY_CODES.ALT) state.altDown = false;
      if (e.keyCode === KEY_CODES.SHIFT) state.shiftDown = false;
      if (e.keyCode === KEY_CODES.CTRL) state.ctrlDown = false;
    }, false);

    window.addEventListener('popstate', function (e) {
      e.preventDefault();
      history.pushState(null, null, location.href);
      K.emit('action:back', { source: 'popstate' });
    });
    history.pushState(null, null, location.href);

    if (document.body) {
      document.body.setAttribute('tabindex', '0');
    }

    K.register('keys', { state, KEY_CODES });
    K.emit('keys:ready', {});
  }

  return { init, state, KEY_CODES };
})();
