/* OmaBerry Keys & Gestures Engine
 * BlackBerry Classic (Q20) input subsystem:
 * - 35-key physical QWERTY keyboard with Alt/Shift/Sym modifiers
 * - 5 physical toolbelt buttons: Call, Menu (BB logo), Optical Trackpad (d-pad + click), Back, End
 * - Optical trackpad directional motion & center press
 * - Edge touch gestures for 720x720 screen (Top down, Bottom up, Left/Right bezel)
 * - Two-finger workspace paging gestures
 * - Mode-aware event dispatch (Desktop, Terminal, Launcher, File Manager)
 */

'use strict';

window.OB = window.OB || {};

window.OB.Keys = (function () {
  const K = window.OB.Kernel;

  // Key code mapping and aliases for BB10 browser environment
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
    CALL: 170,        // Green phone key (varies on BB10 WebKit)
    END_CALL: 171,    // Red phone key
    VOLUME_UP: 175,
    VOLUME_DOWN: 174,
    VOLUME_MUTE: 173
  };

  /* ── State & Tracking ─────────────────────────────────────────── */
  const state = {
    altDown: false,
    shiftDown: false,
    ctrlDown: false,
    lastKeyPressed: null,
    trackpadActive: false,
    touchStartX: 0,
    touchStartY: 0,
    touchStartTime: 0,
    touchCount: 0,
    isSwiping: false
  };

  /* ── Gesture Detection for 720x720 Display ────────────────────── */
  const GESTURE_CONFIG = {
    edgeThreshold: 48,       // Pixels from edge to qualify as edge bezel swipe
    minSwipeDist: 60,        // Minimum distance to register swipe
    maxSwipeTime: 650,       // Max time in ms for flick/swipe
    velocityThreshold: 0.25  // px/ms
  };

  function initTouchGestures() {
    window.addEventListener('touchstart', function (e) {
      state.touchCount = e.touches.length;
      if (e.touches.length === 0) return;

      const t = e.touches[0];
      state.touchStartX = t.clientX;
      state.touchStartY = t.clientY;
      state.touchStartTime = Date.now();
      state.isSwiping = true;

      // Two finger tracking
      if (e.touches.length === 2) {
        state.touch2StartX = e.touches[1].clientX;
        state.touch2StartY = e.touches[1].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchmove', function (e) {
      if (!state.isSwiping || e.touches.length === 0) return;
      // Allow components to listen to ongoing gesture progress
      const t = e.touches[0];
      const dx = t.clientX - state.touchStartX;
      const dy = t.clientY - state.touchStartY;
      K.emit('gesture:move', { dx, dy, x: t.clientX, y: t.clientY, touches: e.touches.length });
    }, { passive: true });

    window.addEventListener('touchend', function (e) {
      if (!state.isSwiping) return;
      state.isSwiping = false;

      const endTime = Date.now();
      const duration = endTime - state.touchStartTime;
      if (duration > GESTURE_CONFIG.maxSwipeTime) return;

      const changed = e.changedTouches[0];
      if (!changed) return;

      const dx = changed.clientX - state.touchStartX;
      const dy = changed.clientY - state.touchStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const velocity = Math.max(absX, absY) / duration;

      if (Math.max(absX, absY) < GESTURE_CONFIG.minSwipeDist && velocity < GESTURE_CONFIG.velocityThreshold) {
        return;
      }

      const startX = state.touchStartX;
      const startY = state.touchStartY;
      const width = window.innerWidth || 720;
      const height = window.innerHeight || 720;

      // Two-finger horizontal swipe -> workspace switch
      if (state.touchCount === 2) {
        if (absX > absY && absX > GESTURE_CONFIG.minSwipeDist) {
          if (dx > 0) {
            K.emit('action:workspace-prev', { source: 'two-finger-swipe' });
          } else {
            K.emit('action:workspace-next', { source: 'two-finger-swipe' });
          }
          return;
        }
      }

      // Single-finger edge bezel gestures (Q20 Classic BB10 style)
      if (startY <= GESTURE_CONFIG.edgeThreshold && dy > GESTURE_CONFIG.minSwipeDist && absY > absX) {
        // Top-edge swipe down -> Quick Settings / Status Shade
        K.emit('action:toggle-shade', { source: 'top-edge' });
        return;
      }

      if (startY >= height - GESTURE_CONFIG.edgeThreshold && dy < -GESTURE_CONFIG.minSwipeDist && absY > absX) {
        // Bottom-edge swipe up -> Minimize / App Overview / Home
        K.emit('action:minimize-to-overview', { source: 'bottom-edge' });
        return;
      }

      if (startX <= GESTURE_CONFIG.edgeThreshold && dx > GESTURE_CONFIG.minSwipeDist && absX > absY) {
        // Left-edge swipe right -> Open Launcher Drawer
        K.emit('action:open-launcher', { source: 'left-edge' });
        return;
      }

      if (startX >= width - GESTURE_CONFIG.edgeThreshold && dx < -GESTURE_CONFIG.minSwipeDist && absX > absY) {
        // Right-edge swipe left -> Quick Actions / Notification Hub
        K.emit('action:toggle-hub', { source: 'right-edge' });
        return;
      }

      // Normal in-screen swipes
      if (absX > absY) {
        if (dx > 0) {
          K.emit('gesture:swipe-right', { dx, dy, startX, startY });
        } else {
          K.emit('gesture:swipe-left', { dx, dy, startX, startY });
        }
      } else {
        if (dy > 0) {
          K.emit('gesture:swipe-down', { dx, dy, startX, startY });
        } else {
          K.emit('gesture:swipe-up', { dx, dy, startX, startY });
        }
      }
    }, { passive: true });
  }

  /* ── Physical Toolbelt Handler ────────────────────────────────── */
  function handleToolbelt(e) {
    const key = e.key;
    const code = e.keyCode || e.which;

    // 1. Back Button (U-turn physical key)
    if (key === 'Escape' || key === 'Back' || key === 'BrowserBack' || code === KEY_CODES.ESCAPE || code === 4) {
      e.preventDefault();
      e.stopPropagation();
      K.emit('action:back', { key, code });
      return true;
    }

    // 2. Menu Button (BlackBerry logo physical key)
    if (key === 'ContextMenu' || key === 'Menu' || code === KEY_CODES.CONTEXT_MENU || (e.altKey && key === 'm')) {
      e.preventDefault();
      e.stopPropagation();
      K.emit('action:menu', { key, code });
      return true;
    }

    // 3. Green Call / Send Phone Key
    if (key === 'Call' || code === KEY_CODES.CALL || key === 'F3') {
      e.preventDefault();
      e.stopPropagation();
      K.emit('action:toolbelt-call', { key, code });
      return true;
    }

    // 4. Red End / Hang up Key
    if (key === 'EndCall' || code === KEY_CODES.END_CALL || key === 'BrowserHome') {
      e.preventDefault();
      e.stopPropagation();
      K.emit('action:toolbelt-end', { key, code });
      return true;
    }

    // 5. Optical Trackpad Center Click
    // In BB10 WebKit, pressing the trackpad center fires a click or Enter with specific traits
    if (key === 'Select' || (code === KEY_CODES.ENTER && e.target === document.body)) {
      // Handled in regular key or dispatched as trackpad click
      K.emit('action:trackpad-click', { target: e.target });
    }

    return false;
  }

  /* ── Keyboard Shortcuts (Omarchy-inspired + Q20 Ergonomics) ────── */
  function handleKeyboardShortcuts(e) {
    const alt = e.altKey || state.altDown;
    const shift = e.shiftKey || state.shiftDown;
    const ctrl = e.ctrlKey || state.ctrlDown;
    const key = (e.key || '').toLowerCase();
    const code = e.keyCode || e.which;
    const currentFocus = K.getState('focus', 'desktop');

    // Toolbelt check first
    if (handleToolbelt(e)) {
      return;
    }

    // Global Alt+ Combinations (Desktop & Window Management)
    if (alt && !ctrl) {
      switch (key) {
        // Alt + T: Open / Toggle Terminal
        case 't':
          e.preventDefault();
          K.emit('action:toggle-terminal', {});
          return;

        // Alt + L: Open / Toggle App Launcher
        case 'l':
          e.preventDefault();
          K.emit('action:toggle-launcher', {});
          return;

        // Alt + F: Open / Toggle File Manager
        case 'f':
          e.preventDefault();
          K.emit('action:toggle-files', {});
          return;

        // Alt + Space: Command Runner / Palette
        case ' ':
        case 'space':
        case 'spacebar':
          e.preventDefault();
          K.emit('action:toggle-palette', {});
          return;

        // Alt + Q: Close active window / overlay
        case 'q':
          e.preventDefault();
          K.emit('action:close-active', {});
          return;

        // Alt + Enter: Toggle Fullscreen
        case 'enter':
          e.preventDefault();
          K.emit('action:toggle-fullscreen', {});
          return;

        // Alt + 1..4: Workspace switching
        case '1':
        case '2':
        case '3':
        case '4':
          e.preventDefault();
          const wsNum = parseInt(key, 10) - 1;
          K.emit('action:switch-workspace', { index: wsNum });
          return;

        // Alt + H/J/K/L: Vim-style navigation
        case 'h':
          e.preventDefault();
          K.emit('nav:direction', { dir: 'left' });
          return;
        case 'j':
          e.preventDefault();
          K.emit('nav:direction', { dir: 'down' });
          return;
        case 'k':
          e.preventDefault();
          K.emit('nav:direction', { dir: 'up' });
          return;
        case 'l':
          e.preventDefault();
          K.emit('nav:direction', { dir: 'right' });
          return;

        // Alt + S: System Monitor / Status
        case 's':
          e.preventDefault();
          K.emit('action:toggle-sysinfo', {});
          return;

        // Alt + R: Quick Restart / Reload Shell
        case 'r':
          if (shift) {
            e.preventDefault();
            location.reload();
            return;
          }
          break;
      }
    }

    // Special Mode Routing:
    // If Terminal has focus, allow typing unless Alt+ shortcuts fired
    if (currentFocus === 'terminal') {
      if (key === 'escape') {
        e.preventDefault();
        K.setFocus('desktop');
        return;
      }
      // Let terminal handle the key
      return;
    }

    // If Launcher has focus
    if (currentFocus === 'launcher') {
      if (key === 'escape') {
        e.preventDefault();
        K.emit('action:close-launcher', {});
        return;
      }
      if (key === 'arrowdown' || key === 'down' || code === KEY_CODES.DOWN) {
        e.preventDefault();
        K.emit('launcher:nav', { dir: 1 });
        return;
      }
      if (key === 'arrowup' || key === 'up' || code === KEY_CODES.UP) {
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

    // If File Manager has focus
    if (currentFocus === 'fileman') {
      if (key === 'escape') {
        e.preventDefault();
        K.emit('action:close-files', {});
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
    }

    // When on Desktop idle: typing any normal alphanumeric character opens the launcher with that search query!
    if (currentFocus === 'desktop' && !alt && !ctrl && key.length === 1 && /[a-zA-Z0-9]/.test(key)) {
      K.emit('action:open-launcher', { initialQuery: key });
    }
  }

  /* ── Trackpad Navigation ──────────────────────────────────────── */
  function initTrackpad() {
    // Trackpad swipe / wheel events
    window.addEventListener('wheel', function (e) {
      K.emit('trackpad:wheel', {
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        deltaZ: e.deltaZ
      });
    }, { passive: true });

    // Trackpad cursor support
    window.addEventListener('mousemove', function (e) {
      if (!state.trackpadActive) {
        state.trackpadActive = true;
        document.body.classList.add('trackpad-active');
      }
      K.emit('trackpad:move', { x: e.clientX, y: e.clientY });
    }, { passive: true });
  }

  /* ── Init ───────────────────────────────────────────────────────── */
  function init() {
    initTouchGestures();
    initTrackpad();

    window.addEventListener('keydown', function (e) {
      if (e.keyCode === KEY_CODES.ALT) state.altDown = true;
      if (e.keyCode === KEY_CODES.SHIFT) state.shiftDown = true;
      if (e.keyCode === KEY_CODES.CTRL) state.ctrlDown = true;
      handleKeyboardShortcuts(e);
    });

    window.addEventListener('keyup', function (e) {
      if (e.keyCode === KEY_CODES.ALT) state.altDown = false;
      if (e.keyCode === KEY_CODES.SHIFT) state.shiftDown = false;
      if (e.keyCode === KEY_CODES.CTRL) state.ctrlDown = false;
    });

    // Intercept hardware Back button from browser history pop
    window.addEventListener('popstate', function (e) {
      e.preventDefault();
      history.pushState(null, null, location.href);
      K.emit('action:back', { source: 'popstate' });
    });
    history.pushState(null, null, location.href);

    K.register('keys', {
      state,
      KEY_CODES,
      simulateKey: function (key, alt, shift) {
        handleKeyboardShortcuts({
          key,
          keyCode: 0,
          altKey: !!alt,
          shiftKey: !!shift,
          ctrlKey: false,
          preventDefault: function () {},
          stopPropagation: function () {}
        });
      }
    });

    K.emit('keys:ready', {});
  }

  return {
    init,
    state,
    KEY_CODES
  };
})();
