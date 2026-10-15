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
    isSwiping: false
  };

  const GESTURE_CONFIG = {
    minSwipeDist: 32,  // 32px is responsive on 720x720 3.5-inch screen
    maxSwipeTime: 850
  };

  /* ── Responsive Touch Swiping (Single Thumb / Finger) ──────────── */
  function initTouchGestures() {
    window.addEventListener('touchstart', function (e) {
      if (e.touches.length === 0) return;
      const t = e.touches[0];
      state.touchStartX = t.clientX;
      state.touchStartY = t.clientY;
      state.touchStartTime = Date.now();
      state.isSwiping = true;
    }, { passive: true });

    window.addEventListener('touchmove', function (e) {
      if (!state.isSwiping || e.touches.length === 0) return;
      const t = e.touches[0];
      const dx = t.clientX - state.touchStartX;
      const dy = t.clientY - state.touchStartY;
      K.emit('gesture:move', { dx, dy, x: t.clientX, y: t.clientY });
    }, { passive: true });

    window.addEventListener('touchend', function (e) {
      if (!state.isSwiping) return;
      state.isSwiping = false;

      const duration = Date.now() - state.touchStartTime;
      if (duration > GESTURE_CONFIG.maxSwipeTime) return;

      const changed = e.changedTouches[0];
      if (!changed) return;

      const dx = changed.clientX - state.touchStartX;
      const dy = changed.clientY - state.touchStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      // 1. Horizontal swipe across workspaces (Left = Next, Right = Prev)
      if (absX >= GESTURE_CONFIG.minSwipeDist && absX > absY) {
        if (dx < 0) {
          K.emit('action:workspace-next', { source: 'touch-swipe' });
        } else {
          K.emit('action:workspace-prev', { source: 'touch-swipe' });
        }
        return;
      }

      // 2. Vertical swipe down from upper half of screen -> Pull down Quick Controls
      if (dy >= GESTURE_CONFIG.minSwipeDist && dy > absX && state.touchStartY < 320) {
        K.emit('action:toggle-shade', { source: 'swipe-down' });
        return;
      }

      // 3. Vertical swipe up from lower screen -> Close shade or return to Desktop
      if (dy <= -GESTURE_CONFIG.minSwipeDist && Math.abs(dy) > absX) {
        K.emit('action:back', { source: 'swipe-up' });
        return;
      }
    }, { passive: true });
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

    // 3. Green Call Key -> Open & Focus Terminal (Workspace 1)
    if (key === 'Call' || code === KEY_CODES.CALL || key === 'F3') {
      e.preventDefault();
      e.stopPropagation();
      K.emit('action:switch-workspace', { index: 1 });
      K.emit('terminal:focus', {});
      return true;
    }

    // 4. Red End Key -> Return to Desktop Home (Workspace 0)
    if (key === 'EndCall' || code === KEY_CODES.END_CALL || key === 'BrowserHome') {
      e.preventDefault();
      e.stopPropagation();
      K.emit('action:switch-workspace', { index: 0 });
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
