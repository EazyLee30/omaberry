/* OmaBerry workspaces
 *
 * A workspace is no longer a home screen with one fixed app in it. Omarchy's
 * desktop is a tiling window manager (manual/04-navigation.md, dwindle), so a
 * workspace is just an empty surface that window.OB.Tile fills as you open
 * things, and it remembers its own tree.
 */

'use strict';

window.OB = window.OB || {};

window.OB.Workspace = (function () {
  const K = window.OB.Kernel;
  const TOTAL_WORKSPACES = 5;
  let currentWorkspace = 0;
  let workspaceEls = [];

  function switchWorkspace(index) {
    if (index < 0 || index >= TOTAL_WORKSPACES) return;
    const prev = currentWorkspace;
    currentWorkspace = index;

    workspaceEls.forEach((el, idx) => {
      el.classList.toggle('active', idx === index);
    });

    K.setState('workspace', currentWorkspace);
    K.emit('workspace:changed', { from: prev, to: currentWorkspace });
    if (window.OB.Tile) window.OB.Tile.render(index);
    focusCurrent();
  }

  /* Whatever this workspace last had focused gets the keyboard back. */
  function focusCurrent() {
    const focused = K.getState('focusedWin');
    if (focused && focused.el && document.body.contains(focused.el)) {
      K.setFocus(focused.app);
      return;
    }
    K.setFocus('desktop');
  }

  function nextWorkspace() {
    switchWorkspace((currentWorkspace + 1) % TOTAL_WORKSPACES);
  }

  function prevWorkspace() {
    switchWorkspace((currentWorkspace - 1 + TOTAL_WORKSPACES) % TOTAL_WORKSPACES);
  }

  function open(app, opts) {
    return window.OB.Tile.open(currentWorkspace, app, opts);
  }

  function close() {
    return window.OB.Tile.close(currentWorkspace);
  }

  function cycle() {
    return window.OB.Tile.cycle();
  }

  function focusDir(dir) {
    return window.OB.Tile.focusDir(dir);
  }

  function init() {
    workspaceEls = Array.from(document.querySelectorAll('.workspace'));
    switchWorkspace(0);

    K.on('action:switch-workspace', (data) => switchWorkspace(data.index));
    K.on('action:workspace-next', () => nextWorkspace());
    K.on('action:workspace-prev', () => prevWorkspace());

    // The trackpad engine emits its own pair of events so a horizontal flick
    // cannot be confused with the keyboard shortcuts.
    K.on('trackpad:workspace-next', () => nextWorkspace());
    K.on('trackpad:workspace-prev', () => prevWorkspace());
    K.on('trackpad:activate', () => cycle());

    K.on('action:window-close', () => close());
    K.on('action:window-cycle', () => cycle());
    K.on('action:focus-left', () => focusDir('left'));
    K.on('action:focus-right', () => focusDir('right'));
    K.on('action:focus-up', () => focusDir('up'));
    K.on('action:focus-down', () => focusDir('down'));

    K.on('tile:opened', () => focusCurrent());
    K.on('tile:closed', () => focusCurrent());

    K.register('workspace', {
      switchWorkspace, nextWorkspace, prevWorkspace,
      open, close, cycle, focusDir,
      getCurrent: () => currentWorkspace
    });
  }

  return {
    init, switchWorkspace, nextWorkspace, prevWorkspace,
    open, close, cycle, focusDir,
    getCurrent: () => currentWorkspace
  };
})();