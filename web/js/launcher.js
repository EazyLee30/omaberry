/* OmaBerry App Launcher & Command Palette (Rofi/Fuzzel style)
 * Instant search, keyboard navigation, and application launching
 * 100% Pure SVG Vector Icons, Zero Unicode Emojis
 * Tailored for BlackBerry Classic (Q20) physical toolbelt
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
      getIcon: () => window.OB.Icons.terminal,
      badge: 'Call key',
      workspace: 0,
      action: () => {
        K.emit('action:open-terminal', {});
      }
    },
    {
      id: 'files',
      title: 'File Manager',
      desc: 'Browse, view and edit files on device',
      getIcon: () => window.OB.Icons.folder,
      badge: 'WS 2',
      workspace: 1,
      action: () => {
        K.emit('action:open-files', {});
      }
    },
    {
      id: 'browser',
      title: 'Berry Browser',
      desc: 'Chromium 120 web browser',
      getIcon: () => window.OB.Icons.browser,
      badge: 'WS 3',
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
      getIcon: () => window.OB.Icons.sysinfo,
      badge: 'WS 4',
      workspace: 3,
      action: () => {
        K.emit('action:toggle-sysinfo', {});
      }
    },
    {
      id: 'agent',
      title: 'AI Agent Hub',
      desc: 'Connect to Codex, Claude or OpenCode',
      getIcon: () => window.OB.Icons.agent,
      badge: ':8120',
      workspace: 3,
      action: () => {
        K.emit('toast:show', { message: 'Agent Hub starting on port 8120...', type: 'info' });
        window.open('http://127.0.0.1:8120', '_blank');
      }
    },
    {
      id: 'qpkg',
      title: 'qpkg Package Manager',
      desc: 'Manage BerryCore CLI packages',
      getIcon: () => window.OB.Icons.package,
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
      getIcon: () => window.OB.Icons.git,
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
      getIcon: () => window.OB.Icons.refresh,
      badge: 'Reload',
      action: () => {
        location.reload();
      }
    }
  ];

  function open(initialQuery) {
    if (!overlay) overlay = document.getElementById('launcher-overlay');
    if (!overlay) return;
    
    overlay.classList.add('open');
    K.setFocus('launcher');

    if (inputEl) {
      inputEl.value = initialQuery || '';
      inputEl.focus();
      setTimeout(() => { try { inputEl.focus(); } catch (e) {} }, 50);
    }
    filterList(inputEl ? inputEl.value : '');
  }

  function close() {
    if (!overlay) overlay = document.getElementById('launcher-overlay');
    if (!overlay) return;
    
    overlay.classList.remove('open');
    if (inputEl) inputEl.blur();
    
    const ws = K.getState('workspace', 0);
    K.setFocus(ws === 0 ? 'terminal' : 'desktop');
    if (ws === 0) {
      K.emit('terminal:focus', {});
    }
  }

  function toggle() {
    if (!overlay) overlay = document.getElementById('launcher-overlay');
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
    if (!listEl) listEl = document.getElementById('launcher-results-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (filteredApps.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'launcher-item';
      empty.innerHTML = `<span class="launcher-item-desc" style="padding:10px; text-align:center;">No matching applications found</span>`;
      listEl.appendChild(empty);
      return;
    }

    filteredApps.forEach((app, idx) => {
      const item = document.createElement('div');
      item.className = 'launcher-item' + (idx === selectedIndex ? ' selected' : '');
      const iconHtml = app.getIcon ? app.getIcon() : (window.OB.Icons.omarchy || '');

      item.innerHTML = `
        <div class="launcher-item-left">
          <div class="launcher-item-icon">${iconHtml}</div>
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
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          executeSelected();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          navigate(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          navigate(-1);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          close();
        }
      });
    }

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
    }

    // Action listeners
    K.on('action:open-launcher', (data) => open(data ? data.initialQuery : ''));
    K.on('action:close-launcher', () => close());
    K.on('action:toggle-launcher', () => toggle());
    K.on('launcher:nav', (data) => navigate(data.dir));
    K.on('launcher:exec-selected', () => executeSelected());
    K.on('action:back', () => {
      if (overlay && overlay.classList.contains('open')) {
        close();
      }
    });

    K.register('launcher', { open, close, toggle });
  }

  return { init, open, close, toggle };
})();
