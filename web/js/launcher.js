/* OmaBerry App Launcher & Command Palette (Rofi/Fuzzel style)
 * Instant search, keyboard navigation, and application launching
 */

'use strict';

window.OB = window.OB || {};

window.OB.Launcher = (function () {
  const K = window.OB.Kernel;

  let overlay = null;
  let inputEl = null;
  let listEl = null;
  let selectedIndex = 0;
  let filteredApps = [];

  const APPS = [
    {
      id: 'terminal',
      title: 'Terminal (BerryCore)',
      desc: 'Native QNX POSIX shell & commands',
      icon: '⌨',
      badge: 'Alt+T',
      workspace: 0,
      action: () => {
        K.emit('action:open-terminal', {});
      }
    },
    {
      id: 'files',
      title: 'File Manager',
      desc: 'Browse, view and edit files on device',
      icon: '📁',
      badge: 'Alt+F',
      workspace: 1,
      action: () => {
        K.emit('action:open-files', {});
      }
    },
    {
      id: 'agent',
      title: 'AI Agent Hub',
      desc: 'Connect to Codex, Claude or OpenCode',
      icon: '🤖',
      badge: 'Alt+A',
      workspace: 3,
      action: () => {
        K.emit('toast:show', { message: 'Agent Hub starting on port 8120...', type: 'info' });
        window.open('http://127.0.0.1:8120', '_blank');
      }
    },
    {
      id: 'browser',
      title: 'Berry Browser',
      desc: 'Chromium 120 web browser',
      icon: '🌐',
      badge: 'Alt+B',
      workspace: 2,
      action: () => {
        K.emit('toast:show', { message: 'Switching to Web workspace', type: 'info' });
        K.emit('action:switch-workspace', { index: 2 });
      }
    },
    {
      id: 'sysinfo',
      title: 'System Monitor',
      desc: 'CPU load, RAM usage, processes',
      icon: '📊',
      badge: 'Alt+S',
      workspace: 3,
      action: () => {
        K.emit('action:toggle-sysinfo', {});
      }
    },
    {
      id: 'qpkg',
      title: 'qpkg Package Manager',
      desc: 'Manage BerryCore CLI packages',
      icon: '📦',
      badge: 'CLI',
      workspace: 0,
      action: () => {
        K.emit('action:open-terminal', {});
        setTimeout(() => {
          K.emit('terminal:run', { cmd: 'qpkg help\n' });
        }, 300);
      }
    },
    {
      id: 'git',
      title: 'Git Status',
      desc: 'Check git repository status',
      icon: '🌿',
      badge: 'CLI',
      workspace: 0,
      action: () => {
        K.emit('action:open-terminal', {});
        setTimeout(() => {
          K.emit('terminal:run', { cmd: 'git status\n' });
        }, 300);
      }
    },
    {
      id: 'restart',
      title: 'Reload OmaBerry Shell',
      desc: 'Restart the desktop interface',
      icon: '🔄',
      badge: 'Alt+Shift+R',
      action: () => {
        location.reload();
      }
    }
  ];

  function open(initialQuery) {
    if (!overlay) return;
    overlay.classList.add('open');
    K.setFocus('launcher');

    if (inputEl) {
      inputEl.value = initialQuery || '';
      inputEl.focus();
    }
    filterList(inputEl ? inputEl.value : '');
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('open');
    if (inputEl) inputEl.blur();
    K.setFocus('desktop');
  }

  function toggle() {
    if (overlay && overlay.classList.contains('open')) {
      close();
    } else {
      open();
    }
  }

  function filterList(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
      filteredApps = APPS.slice();
    } else {
      filteredApps = APPS.filter(app => {
        return app.title.toLowerCase().includes(q) ||
               app.desc.toLowerCase().includes(q) ||
               app.id.toLowerCase().includes(q);
      });
    }
    selectedIndex = 0;
    renderList();
  }

  function renderList() {
    if (!listEl) return;
    listEl.innerHTML = '';

    if (filteredApps.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'launcher-item';
      empty.innerHTML = `<span class="launcher-item-desc">No matching applications or commands</span>`;
      listEl.appendChild(empty);
      return;
    }

    filteredApps.forEach((app, idx) => {
      const item = document.createElement('div');
      item.className = 'launcher-item' + (idx === selectedIndex ? ' selected' : '');
      item.innerHTML = `
        <div class="launcher-item-left">
          <div class="launcher-item-icon">${app.icon}</div>
          <div class="launcher-item-text">
            <span class="launcher-item-title">${app.title}</span>
            <span class="launcher-item-desc">${app.desc}</span>
          </div>
        </div>
        <span class="launcher-item-badge">${app.badge}</span>
      `;

      item.addEventListener('click', () => {
        selectedIndex = idx;
        executeSelected();
      });

      listEl.appendChild(item);
    });

    // Ensure selected item is scrolled into view
    const selEl = listEl.querySelector('.launcher-item.selected');
    if (selEl) {
      selEl.scrollIntoView({ block: 'nearest' });
    }
  }

  function navigate(dir) {
    if (filteredApps.length === 0) return;
    selectedIndex = (selectedIndex + dir + filteredApps.length) % filteredApps.length;
    renderList();
  }

  function executeSelected() {
    if (filteredApps.length > 0 && filteredApps[selectedIndex]) {
      const app = filteredApps[selectedIndex];
      close();
      if (app.workspace !== undefined) {
        K.emit('action:switch-workspace', { index: app.workspace });
      }
      if (app.action) {
        app.action();
      }
    }
  }

  function init() {
    overlay = document.getElementById('launcher-overlay');
    inputEl = document.getElementById('launcher-search-input');
    listEl = document.getElementById('launcher-results-list');

    if (inputEl) {
      inputEl.addEventListener('input', (e) => {
        filterList(e.target.value);
      });
    }

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
    }

    // Action listeners from Keys engine
    K.on('action:open-launcher', (data) => {
      open(data.initialQuery);
    });

    K.on('action:close-launcher', () => close());
    K.on('action:toggle-launcher', () => toggle());

    K.on('launcher:nav', (data) => {
      navigate(data.dir);
    });

    K.on('launcher:exec-selected', () => {
      executeSelected();
    });

    K.on('action:back', () => {
      if (overlay && overlay.classList.contains('open')) {
        close();
      }
    });

    K.register('launcher', {
      open,
      close,
      toggle
    });
  }

  return { init, open, close, toggle };
})();
