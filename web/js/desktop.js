/* OmaBerry Desktop Controller
 * Master orchestrator connecting all subsystems, toolbelt, dock, and toasts
 */

'use strict';

window.OB = window.OB || {};

window.OB.Desktop = (function () {
  const K = window.OB.Kernel;

  let toastContainer = null;

  function showToast(message, type = 'info', timeoutMs = 3000) {
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
    // Priority order for physical Back button:
    // 1. Close Command Palette or Launcher if open
    // 2. Close Quick Shade if open
    // 3. If in Terminal or Fileman focus, unfocus to Desktop
    // 4. Default: return to Workspace 0
    const launcher = document.getElementById('launcher-overlay');
    if (launcher && launcher.classList.contains('open')) {
      K.emit('action:close-launcher', {});
      return;
    }

    const shade = document.getElementById('quick-shade');
    if (shade && shade.classList.contains('open')) {
      K.emit('action:toggle-shade', {});
      return;
    }

    const focus = K.getState('focus');
    if (focus !== 'desktop') {
      K.setFocus('desktop');
      showToast('Focus: Desktop', 'info', 1000);
      return;
    }

    // Already on desktop, if on another workspace, return to 0
    if (K.getState('workspace') !== 0) {
      K.emit('action:switch-workspace', { index: 0 });
    }
  }

  function initDock() {
    const dockItems = document.querySelectorAll('.dock-item');
    dockItems.forEach(item => {
      item.addEventListener('click', () => {
        const action = item.getAttribute('data-action');
        switch (action) {
          case 'terminal':
            K.emit('action:toggle-terminal', {});
            break;
          case 'launcher':
            K.emit('action:toggle-launcher', {});
            break;
          case 'files':
            K.emit('action:open-files', {});
            break;
          case 'shade':
            K.emit('action:toggle-shade', {});
            break;
        }
      });
    });
  }

  function initToolbelt() {
    // 1. Green Call Button -> Quick open Terminal
    K.on('action:toolbelt-call', () => {
      showToast('Call Key: Launching Terminal', 'info');
      K.emit('action:open-terminal', {});
    });

    // 2. Red End Button -> Minimize / Return to clean Desktop
    K.on('action:toolbelt-end', () => {
      showToast('End Key: Return to Desktop', 'info');
      K.emit('action:close-launcher', {});
      const shade = document.getElementById('quick-shade');
      if (shade) shade.classList.remove('open');
      K.emit('action:switch-workspace', { index: 0 });
      K.setFocus('desktop');
    });

    // 3. Menu Button (BlackBerry logo) -> Toggle Launcher or Action Menu
    K.on('action:menu', () => {
      K.emit('action:toggle-launcher', {});
    });

    // 4. Back Button (U-turn physical key)
    K.on('action:back', () => {
      handleBackAction();
    });

    // Bottom bezel swipe up -> App overview / Home
    K.on('action:minimize-to-overview', () => {
      showToast('Swipe Up: Home Overview', 'info', 1200);
      handleBackAction();
    });
  }

  function init() {
    toastContainer = document.getElementById('toast-container');

    // Initialize all modules in sequence
    window.OB.Keys.init();
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

    // Connect WebSocket & start kernel
    K.init();

    showToast('OmaBerry Desktop v0.1 ready (Q20)', 'success', 2500);
  }

  return { init, showToast };
})();

// Auto-boot when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.OB.Desktop.init();
});
