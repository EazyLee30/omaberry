/* OmaBerry Workspace Manager
 * 4 virtual workspaces, tiling layout, window focus management
 */

'use strict';

window.OB = window.OB || {};

window.OB.Workspace = (function () {
  const K = window.OB.Kernel;
  const TOTAL_WORKSPACES = 4;
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
      const titleEl = document.getElementById('status-app-title');
      if (titleEl) {
        titleEl.textContent = winEl.querySelector('.window-title')?.textContent || appName;
      }
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

    // Initial activation
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
        const win = btn.closest('.window-tile');
        if (win) {
          win.style.display = 'none';
          K.emit('window:closed', { target: win });
        }
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
