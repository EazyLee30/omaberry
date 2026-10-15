/* OmaBerry File Manager
 * Safe file browsing, viewing and editing on Q20 / QNX filesystem
 */

'use strict';

window.OB = window.OB || {};

window.OB.FileManager = (function () {
  const K = window.OB.Kernel;

  let listEl = null;
  let pathEl = null;
  let viewerEl = null;
  let currentPath = '/accounts/1000/shared';
  let entries = [];
  let selectedIndex = 0;

  function loadDir(path) {
    currentPath = path || currentPath;
    if (pathEl) pathEl.textContent = currentPath;

    // Send fs:list request via WebSocket
    const sent = K.send('fs:list', { path: currentPath });
    if (!sent) {
      // Mock fallback when server is offline
      entries = [
        { name: '..', isDir: true, size: 0 },
        { name: 'misc', isDir: true, size: 4096 },
        { name: 'documents', isDir: true, size: 4096 },
        { name: 'downloads', isDir: true, size: 4096 },
        { name: 'notes.txt', isDir: false, size: 128 }
      ];
      renderList();
    }
  }

  function renderList() {
    if (!listEl) return;
    listEl.innerHTML = '';

    entries.forEach((entry, idx) => {
      const item = document.createElement('div');
      item.className = 'launcher-item' + (idx === selectedIndex ? ' selected' : '');
      const icon = entry.isDir ? '📁' : '📄';
      const sizeStr = entry.isDir ? 'DIR' : `${entry.size || 0}B`;

      item.innerHTML = `
        <div class="launcher-item-left">
          <div class="launcher-item-icon">${icon}</div>
          <span class="launcher-item-title">${entry.name}</span>
        </div>
        <span class="launcher-item-badge">${sizeStr}</span>
      `;

      item.addEventListener('click', () => {
        selectedIndex = idx;
        openSelected();
      });

      listEl.appendChild(item);
    });
  }

  function openSelected() {
    if (entries.length === 0 || !entries[selectedIndex]) return;
    const entry = entries[selectedIndex];

    if (entry.isDir) {
      if (entry.name === '..') {
        goUp();
      } else {
        const nextPath = currentPath.endsWith('/') ? currentPath + entry.name : currentPath + '/' + entry.name;
        loadDir(nextPath);
      }
    } else {
      // View file
      const filePath = currentPath.endsWith('/') ? currentPath + entry.name : currentPath + '/' + entry.name;
      K.send('fs:read', { path: filePath });
    }
  }

  function goUp() {
    if (currentPath === '/' || currentPath === '') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const upPath = '/' + parts.join('/');
    loadDir(upPath || '/');
  }

  function navigate(dir) {
    if (entries.length === 0) return;
    selectedIndex = (selectedIndex + dir + entries.length) % entries.length;
    renderList();
  }

  function init() {
    listEl = document.getElementById('fm-list');
    pathEl = document.getElementById('fm-path');
    viewerEl = document.getElementById('fm-viewer');

    loadDir(currentPath);

    // WebSocket responses
    K.on('ws:fs:list:res', (msg) => {
      if (msg && msg.entries) {
        entries = msg.entries;
        if (currentPath !== '/') {
          entries.unshift({ name: '..', isDir: true, size: 0 });
        }
        selectedIndex = 0;
        renderList();
      }
    });

    K.on('ws:fs:read:res', (msg) => {
      if (msg && msg.content && viewerEl) {
        viewerEl.value = msg.content;
        K.emit('toast:show', { message: `Opened: ${msg.path}`, type: 'success' });
      }
    });

    // Keyboard actions
    K.on('fileman:nav', (data) => navigate(data.dir));
    K.on('fileman:open-selected', () => openSelected());
    K.on('fileman:up-dir', () => goUp());

    K.on('action:open-files', () => {
      K.emit('action:switch-workspace', { index: 1 });
      K.setFocus('fileman');
    });

    K.register('filemanager', {
      loadDir,
      openSelected,
      goUp
    });
  }

  return { init, loadDir, openSelected, goUp };
})();
