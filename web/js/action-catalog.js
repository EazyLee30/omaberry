/* OmaBerry action catalog
 *
 * The registry in web/js/actions.js is the mechanism; this is the menu of
 * what the desktop can actually do. Every entry here is reachable three ways
 * -- the keyboard, the menu, and (once a bridge exists) an agent over SSH --
 * which is the point of having a registry instead of onclick handlers.
 *
 * Each action returns a receipt. Where the effect is not observable from
 * here, `observed: false` is set explicitly rather than left to be guessed.
 */

'use strict';

window.OB = window.OB || {};

window.OB.ActionCatalog = (function () {
  const K = window.OB.Kernel;

  function registerAll() {
    const A = window.OB.Actions;
    const W = window.OB.Workspace;
    const T = window.OB.Theme;

    /* ── workspaces ────────────────────────────────────────────── */
    A.register('workspace.switch', {
      title: 'Switch workspace',
      group: 'workspace',
      description: 'Show one of the five workspaces',
      run: (args) => {
        const before = W.getCurrent();
        W.switchWorkspace(args.index);
        return {
          ok: true,
          changed: before !== W.getCurrent(),
          observed: true,
          data: { from: before, to: W.getCurrent() }
        };
      }
    });

    A.register('workspace.next', {
      title: 'Next workspace',
      group: 'workspace',
      run: () => {
        const before = W.getCurrent();
        W.nextWorkspace();
        return { ok: true, observed: true, data: { from: before, to: W.getCurrent() } };
      }
    });

    A.register('workspace.prev', {
      title: 'Previous workspace',
      group: 'workspace',
      run: () => {
        const before = W.getCurrent();
        W.prevWorkspace();
        return { ok: true, observed: true, data: { from: before, to: W.getCurrent() } };
      }
    });

    /* ── windows (dwindle tiling) ──────────────────────────────── */
    A.register('window.open', {
      title: 'Open window',
      group: 'window',
      description: 'Tile an app into the current workspace (dwindle: splits in half)',
      run: (args) => {
        const win = W.open(args.app);
        if (!win) return { ok: false, error: 'no space or unknown app: ' + args.app, observed: true };
        return { ok: true, observed: true, data: { app: args.app, id: win.id } };
      }
    });

    A.register('window.close', {
      title: 'Close window',
      group: 'window',
      run: () => {
        W.close();
        return { ok: true, observed: true };
      }
    });

    A.register('window.cycle', {
      title: 'Cycle focus',
      group: 'window',
      run: () => { W.cycle(); return { ok: true, observed: true }; }
    });

    /* ── theming ──────────────────────────────────────────────── */
    A.register('theme.set', {
      title: 'Set theme',
      group: 'style',
      description: 'Apply an Omarchy palette and its wallpaper',
      run: (args) => {
        const r = T.apply(args.theme, { wallpaper: args.wallpaper });
        return { ok: true, observed: true, data: r };
      }
    });

    A.register('theme.next', {
      title: 'Next theme',
      group: 'style',
      run: () => {
        const keys = T.list();
        const now = K.getState('theme');
        const next = keys[(keys.indexOf(now) + 1) % keys.length];
        T.apply(next);
        return { ok: true, observed: true, data: { theme: next } };
      }
    });

    A.register('theme.wallpaper', {
      title: 'Next wallpaper',
      group: 'style',
      run: () => {
        const r = T.cycleWallpaper();
        return r
          ? { ok: true, observed: true, data: r }
          : { ok: false, error: 'theme has no wallpaper', observed: true };
      }
    });

    /* ── agents ───────────────────────────────────────────────── */
    A.register('agent.list', {
      title: 'List agents',
      group: 'agent',
      requires: ['#agents'],
      description: 'Sessions the bridge has reported, with their observed status',
      run: () => {
        const list = window.OB.Agents.list();
        return { ok: true, observed: true, data: { sessions: list } };
      }
    });

    A.register('agent.send', {
      title: 'Send prompt to agent',
      group: 'agent',
      requires: ['#agents'],
      description: 'Delivers text to a session. Reports delivery, not acceptance.',
      run: (args) => window.OB.Agents.send(args.id, args.text)
    });

    A.register('agent.bridge', {
      title: 'Agent bridge status',
      group: 'agent',
      requires: ['#agents'],
      run: () => ({ ok: true, observed: true, data: window.OB.Agents.bridge() })
    });

    /* ── what can I do ────────────────────────────────────────── */
    A.register('shell.actions', {
      title: 'List available actions',
      group: 'meta',
      description: 'Everything the keyboard, the menu and an agent can invoke',
      run: (args) => ({
        ok: true,
        observed: true,
        data: { actions: window.OB.Actions.list({ availableOnly: args.availableOnly }) }
      })
    });
  }

  function init() {
    registerAll();
    K.emit('action-catalog:ready', { count: window.OB.Actions.list().length });
  }

  return { init, registerAll };
})();