/* OmaBerry Desktop Controller
 * Master orchestrator connecting all subsystems, toolbelt, dock, and toasts
 */

'use strict';

window.OB = window.OB || {};

window.OB.Desktop = (function () {
  const K = window.OB.Kernel;

  let toastContainer = null;

  function showToast(message, type = 'info', timeoutMs = 2500) {
    if (!toastContainer) toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s ease';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    }, timeoutMs);
  }

  function handleBackAction() {
    // 1. Close Launcher if open
    const launcher = document.getElementById('launcher-overlay');
    if (launcher && launcher.classList.contains('open')) {
      K.emit('action:close-launcher', {});
      return;
    }

    // 2. Close Quick Shade if open
    const shade = document.getElementById('quick-shade');
    if (shade && shade.classList.contains('open')) {
      K.emit('action:toggle-shade', {});
      return;
    }

    // 3. If on Workspace > 0, return to Desktop Home (Workspace 0)
    if (K.getState('workspace', 0) !== 0) {
      K.emit('action:switch-workspace', { index: 0 });
      return;
    }

    // Already on Desktop Home
    showToast('OmaBerry Desktop', 'info', 1000);
  }

  function initDock() {
    const dockItems = document.querySelectorAll('.dock-item');
    dockItems.forEach(item => {
      item.addEventListener('click', () => {
        const action = item.getAttribute('data-action');
        switch (action) {
          case 'desktop':
            K.emit('action:switch-workspace', { index: 0 });
            break;
          case 'terminal':
            K.emit('action:switch-workspace', { index: 1 });
            K.emit('terminal:focus', {});
            break;
          case 'files':
            K.emit('action:switch-workspace', { index: 2 });
            break;
          case 'launcher':
            K.emit('action:toggle-launcher', {});
            break;
          case 'shade':
            K.emit('action:toggle-shade', {});
            break;
        }
      });
    });

    // Update active state in dock when workspace changes
    K.on('workspace:changed', (data) => {
      dockItems.forEach(item => {
        const action = item.getAttribute('data-action');
        if (data.to === 0 && action === 'desktop') item.classList.add('active');
        else if (data.to === 1 && action === 'terminal') item.classList.add('active');
        else if (data.to === 2 && action === 'files') item.classList.add('active');
        else item.classList.remove('active');
      });
    });
  }

  function initToolbelt() {
    // 1. Green Call Button -> Switch to Terminal & Focus
    K.on('action:toolbelt-call', () => {
      K.emit('action:switch-workspace', { index: 1 });
      K.emit('terminal:focus', {});
    });

    // 2. Red End Button -> Return to Desktop Home (Workspace 0)
    K.on('action:toolbelt-end', () => {
      K.emit('action:close-launcher', {});
      const shade = document.getElementById('quick-shade');
      if (shade) shade.classList.remove('open');
      K.emit('action:switch-workspace', { index: 0 });
    });

    // 3. Menu Button (BlackBerry logo) -> Toggle Launcher
    K.on('action:menu', () => {
      K.emit('action:toggle-launcher', {});
    });

    // 4. Back Button (U-turn key)
    K.on('action:back', () => {
      handleBackAction();
    });

    // Swipe up
    K.on('action:swipe-up', () => {
      handleBackAction();
    });
  }

  function init() {
    toastContainer = document.getElementById('toast-container');

    // Initialize modules in sequence
    window.OB.Keys.init();
    window.OB.Trackpad.init();
    window.OB.Meta.init();
    window.OB.StatusBar.init();
    window.OB.Workspace.init();
    window.OB.Launcher.init();
    window.OB.Terminal.init();
    window.OB.FileManager.init();

    initDock();
    initToolbelt();

    K.on('toast:show', (data) => {
      showToast(data.message, data.type, data.timeoutMs);
    });

    // Start kernel & connect WebSocket
    K.init();

    // Default to Desktop Home
    window.OB.Workspace.switchWorkspace(0);
  }

  return { init, showToast };
})();

document.addEventListener('DOMContentLoaded', () => {
  window.OB.Desktop.init();
});
