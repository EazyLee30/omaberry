/* OmaBerry tiling window manager — dwindle
 *
 * Omarchy's desktop is not a home screen with icons on it. Per
 * manual/04-navigation.md it is Hyprland's dwindle layout: "It keeps all the
 * windows you open on a single workspace visible at all time, even if it has
 * to shrink them down." There is no dashboard and no dock — the menu is how
 * you launch things, and the bar is the only permanent chrome.
 *
 * So the model is a binary tree, the same one Hyprland keeps:
 *
 *   - open a window and the focused leaf is split in half (looknfeel.lua sets
 *     dwindle.force_split = 2, i.e. equal halves)
 *   - close it and the parent collapses into its sibling
 *   - the tree is rendered into nested flex rows/columns, which is the whole
 *     implementation — no absolute positioning, no manual coordinates
 *
 * Split direction is chosen from the pane's own aspect ratio rather than
 * fixed, so on a 720x720 square screen the tiles stay close to square instead
 * of collapsing into slivers after three windows.
 */

'use strict';

window.OB = window.OB || {};

window.OB.Tile = (function () {
  const K = window.OB.Kernel;

  const GAPS = 5;   // hypr general.gaps_in
  const MIN_PANE = 90; // below this a split is not worth it on a 3.5" panel

  let seq = 0;
  const workspaces = new Map();   // ws index -> root node (or null)

  function wsState(ws) {
    if (!workspaces.has(ws)) workspaces.set(ws, null);
    return workspaces.get(ws);
  }

  /* ── tree helpers ─────────────────────────────────────────────── */

  function leaf(app, el) {
    return { win: { app: app, el: el, id: ++seq }, children: null, dir: 'h' };
  }

  function findLeaf(node, winId) {
    if (!node) return null;
    if (node.win && node.win.id === winId) return node;
    return findLeaf(node.children && node.children[0], winId) ||
           findLeaf(node.children && node.children[1], winId);
  }

  function collect(node, out) {
    if (!node) return out;
    if (node.win) out.push(node);
    if (node.children) { collect(node.children[0], out); collect(node.children[1], out); }
    return out;
  }

  function remove(node, winId) {
    if (!node) return null;
    if (node.win && node.win.id === winId) return null;
    if (node.children) {
      node.children[0] = remove(node.children[0], winId);
      node.children[1] = remove(node.children[1], winId);
      if (!node.children[0]) return node.children[1];
      if (!node.children[1]) return node.children[0];
    }
    return node;
  }

  /* Replace `target` with a split of [target, fresh]. Returns the new subtree,
     which is a different node whenever the target is the root -- hence the
     rebinding call sites rather than in-place mutation. */
  function divide(node, target, fresh, dir) {
    if (node === target) {
      return { win: null, children: [target, fresh], dir: dir };
    }
    if (!node.children) return node;
    node.children[0] = divide(node.children[0], target, fresh, dir);
    node.children[1] = divide(node.children[1], target, fresh, dir);
    return node;
  }

  /* ── rendering ────────────────────────────────────────────────── */

  function paneFor(node, w, h) {
    const box = document.createElement('div');
    box.className = node.children ? 'tile-split' : 'tile-pane';

    if (!node.children) {
      box.style.flex = '1 1 0';
      box.appendChild(node.win.el);
      node.win.el.classList.toggle('focused', node.win === K.getState('focusedWin'));
      return box;
    }

    const stacked = node.dir === 'v';
    box.style.flexDirection = stacked ? 'column' : 'row';
    box.style.gap = GAPS + 'px';

    const halfW = stacked ? w : Math.floor((w - GAPS) / 2);
    const halfH = stacked ? Math.floor((h - GAPS) / 2) : h;
    const first = paneFor(node.children[0], halfW, halfH);
    const second = paneFor(node.children[1], halfW, halfH);
    first.style.flex = second.style.flex = '1 1 0';
    box.appendChild(first);
    box.appendChild(second);
    return box;
  }

  function pickDir(node, w, h) {
    // Split the longer axis so tiles trend square on a square screen.
    return w >= h ? 'h' : 'v';
  }

  function render(ws) {
    const host = document.getElementById('ws-' + ws);
    if (!host) return;
    const root = wsState(ws);
    host.textContent = '';
    if (!root) {
      host.setAttribute('data-empty', '1');
      return;
    }
    host.removeAttribute('data-empty');
    const rect = host.getBoundingClientRect();
    host.appendChild(paneFor(root, Math.round(rect.width), Math.round(rect.height)));
  }

  /* ── public ───────────────────────────────────────────────────── */

  function open(ws, app, opts) {
    const tpl = document.getElementById('tpl-' + app);
    if (!tpl) {
      K.emit('toast', { text: 'No template for ' + app, kind: 'error' });
      return null;
    }

    const existing = findApp(ws, app);
    if (existing && !(opts && opts.allowDuplicate)) {
      // One PTY, one DOM id per app. Opening an app that is already open
      // focuses it rather than pretending to be a window manager that can
      // fork a second terminal.
      focus(existing.win.id);
      K.emit('tile:reused', { app: app, ws: ws });
      return existing.win;
    }

    const el = tpl.content.firstElementChild.cloneNode(true);
    const root = wsState(ws);
    const fresh = leaf(app, el);

    const leaves = collect(root, []);
    if (leaves.length) {
      const target = leaves[leaves.length - 1];
      const host = document.getElementById('ws-' + ws);
      const rect = host ? host.getBoundingClientRect() : { width: 360, height: 360 };
      const size = paneSize(root, target, Math.round(rect.width), Math.round(rect.height));
      if (size.w < MIN_PANE * 2 || size.h < MIN_PANE * 2) {
        K.emit('toast', { text: 'Space exhausted — close a window first', kind: 'warn' });
        return null;
      }
      // Replace the target leaf with a split holding the old window and the
      // new one. This rebuilds the path on the way back up; mutating the
      // target in place would make it contain itself.
      workspaces.set(ws, divide(root, target, fresh, pickDir(target, size.w, size.h)));
    } else {
      workspaces.set(ws, fresh);
    }

    const host = document.getElementById('ws-' + ws);
    if (host) {
      host.textContent = '';
      render(ws);
    }

    bind(el, ws);
    K.setState('focusedWin', fresh.win);
    focus(fresh.win.id);

    if (app === 'terminal' && window.OB.Terminal) {
      window.OB.Terminal.focus();
      if (window.OB.Terminal.init) window.OB.Terminal.init();
    }
    K.emit('tile:opened', { app: app, ws: ws });
    return fresh.win;
  }

  function paneSize(node, target, w, h) {
    if (node === target) return { w: w, h: h };
    if (!node.children) return { w: w, h: h };
    const stacked = node.dir === 'v';
    const hw = stacked ? w : Math.floor((w - GAPS) / 2);
    const hh = stacked ? Math.floor((h - GAPS) / 2) : h;
    if (node.children[0] === target || contains(node.children[0], target)) {
      return paneSize(node.children[0], target, hw, hh);
    }
    return paneSize(node.children[1], target, hw, hh);
  }

  function contains(node, target) {
    if (node === target) return true;
    if (!node || !node.children) return false;
    return contains(node.children[0], target) || contains(node.children[1], target);
  }

  function findApp(ws, app) {
    const leaves = collect(wsState(ws), []);
    for (const l of leaves) if (l.win.app === app) return l;
    return null;
  }

  function close(ws, winId) {
    const root = wsState(ws);
    const id = winId || (K.getState('focusedWin') || {}).id;
    if (!root || !id) return;
    const node = findLeaf(root, id);
    if (!node) return;

    const next = remove(root, id);
    workspaces.set(ws, next);
    if (node.win.el.parentNode) node.win.el.parentNode.removeChild(node.win.el);
    render(ws);

    const leaves = collect(next, []);
    const focused = leaves.length ? leaves[leaves.length - 1].win : null;
    K.setState('focusedWin', focused);
    if (focused) focus(focused.id);
    K.emit('tile:closed', { app: node.win.app, ws: ws });
  }

  function focus(winId) {
    const node = findLeaf(wsState(window.OB.Workspace.getCurrent()), winId);
    if (!node) return;
    K.setState('focusedWin', node.win);
    document.querySelectorAll('.window-tile').forEach(el => el.classList.remove('focused'));
    node.win.el.classList.add('focused');
    K.setFocus(node.win.app);
    K.emit('tile:focused', { app: node.win.app });
  }

  function cycle() {
    const ws = window.OB.Workspace.getCurrent();
    const leaves = collect(wsState(ws), []);
    if (leaves.length < 2) return;
    const cur = (K.getState('focusedWin') || {}).id;
    const i = leaves.findIndex(l => l.win.id === cur);
    focus(leaves[(i + 1) % leaves.length].win.id);
  }

  /* Directional focus across the tree, which is what Alt+H/J/K/L does in
     Hyprland. With dwindle the useful axes are horizontal (left/right) and
     vertical (up/down) within the current row/column. */
  function focusDir(dir) {
    const ws = window.OB.Workspace.getCurrent();
    const leaves = collect(wsState(ws), []);
    if (leaves.length < 2) return;
    const focused = findLeaf(wsState(ws), (K.getState('focusedWin') || {}).id);
    if (!focused) return;
    const host = document.getElementById('ws-' + ws);
    const hostRect = host.getBoundingClientRect();
    const box = focused.win.el.getBoundingClientRect();
    const cx = box.left - hostRect.left + box.width / 2;
    const cy = box.top - hostRect.top + box.height / 2;

    let best = null;
    let bestScore = Infinity;
    for (const l of leaves) {
      if (l === focused) continue;
      const b = l.win.el.getBoundingClientRect();
      const x = b.left - hostRect.left + b.width / 2;
      const y = b.top - hostRect.top + b.height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const along = dir === 'left' || dir === 'right' ? dx : dy;
      const across = dir === 'left' || dir === 'right' ? dy : dx;
      if ((dir === 'left' && along >= -1) || (dir === 'right' && along <= 1) ||
          (dir === 'up' && along >= -1) || (dir === 'down' && along <= 1)) continue;
      // Prefer the neighbour on the wanted axis that also overlaps the other.
      const score = Math.abs(along) + Math.abs(across) * 2;
      if (score < bestScore) { bestScore = score; best = l; }
    }
    if (best) focus(best.win.id);
  }

  function closeFocused() {
    close(window.OB.Workspace.getCurrent());
  }

  function bind(el, ws) {
    const tile = el;
    tile.addEventListener('mousedown', () => {
      const win = collect(wsState(ws), []).find(l => l.win.el === tile);
      if (win) focus(win.win.id);
    }, true);

    const closer = tile.querySelector('[data-tile-close]');
    if (closer) closer.addEventListener('click', (e) => {
      e.stopPropagation();
      closeFocused();
    });
  }

  function init() {
    K.register('tile', { open, close, focus, cycle, focusDir, render });
    K.emit('tile:ready', {});
  }

  return { init, open, close, focus, cycle, focusDir, closeFocused, render, windows: collect };
})();