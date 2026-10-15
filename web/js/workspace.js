/* OmaBerry Workspace Manager
 * 5 virtual workspaces:
 *   WS 0: Desktop Home (Omarchy Canvas)
 *   WS 1: Terminal (BerryCore sh)
 *   WS 2: File Manager (BerryFS)
 *   WS 3: Web & Community Hub
 *   WS 4: System Diagnostics
 */

'use strict';

window.OB = window.OB || {};

window.OB.Workspace = (function () {
  const K = window.OB.Kernel;
  const TOTAL_WORKSPACES = 5;
  let currentWorkspace = 0;
  let workspaceEls = [];

  function switchWorkspace(index) {
    if (index < 0 || index >= TOTAL_WORKSPACES || index === currentWorkspace) {
      return;
    }
    const prev = currentWorkspace;
    currentWorkspace = index;

    workspaceEls.forEach((el, idx) => {
      if (idx === index) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    K.setState('workspace', currentWorkspace);
    K.emit('workspace:changed', { from: prev, to: currentWorkspace });

    if (currentWorkspace === 1) {
      K.setFocus('terminal');
      K.emit('terminal:focus', {});
    } else if (currentWorkspace === 2) {
      K.setFocus('fileman');
    } else {
      K.setFocus('desktop');
    }
  }

  function nextWorkspace() {
    switchWorkspace((currentWorkspace + 1) % TOTAL_WORKSPACES);
  }

  function prevWorkspace() {
    switchWorkspace((currentWorkspace - 1 + TOTAL_WORKSPACES) % TOTAL_WORKSPACES);
  }

  function focusWindow(winEl) {
    if (!winEl) return;
    document.querySelectorAll('.window-tile').forEach(el => el.classList.remove('focused'));
    winEl.classList.add('focused');

    const appName = winEl.getAttribute('data-app');
    if (appName) {
      K.setFocus(appName);
    }
  }

  function toggleFullscreen(winEl) {
    const target = winEl || document.querySelector('.workspace.active .window-tile.focused') || document.querySelector('.workspace.active .window-tile');
    if (!target) return;

    const isFull = target.classList.toggle('fullscreen');
    K.setState('fullscreen', isFull);
    K.emit('window:fullscreen', { isFull, target });
  }

  function init() {
    const els = document.querySelectorAll('.workspace');
    workspaceEls = Array.from(els);

    // Initial activation: Workspace 0 is Desktop Home
    switchWorkspace(0);

    // Register click-to-focus on windows
    document.querySelectorAll('.window-tile').forEach(win => {
      win.addEventListener('mousedown', () => focusWindow(win));
      win.addEventListener('touchstart', () => focusWindow(win), { passive: true });
    });

    // Window controls
    document.querySelectorAll('.win-btn.close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        switchWorkspace(0); // Close window returns to desktop
      });
    });

    document.querySelectorAll('.win-btn.max').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const win = btn.closest('.window-tile');
        toggleFullscreen(win);
      });
    });

    // Listen to actions
    K.on('action:switch-workspace', (data) => {
      switchWorkspace(data.index);
    });

    K.on('action:workspace-next', () => nextWorkspace());
    K.on('action:workspace-prev', () => prevWorkspace());

    K.on('action:toggle-fullscreen', () => {
      toggleFullscreen();
    });

    K.register('workspace', {
      switchWorkspace,
      nextWorkspace,
      prevWorkspace,
      focusWindow,
      toggleFullscreen,
      getCurrent: () => currentWorkspace
    });
  }

  return { init, switchWorkspace, nextWorkspace, prevWorkspace, focusWindow, toggleFullscreen };
})();
