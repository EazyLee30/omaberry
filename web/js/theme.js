/* OmaBerry theme engine
 *
 * Omarchy themes are a single set of colours applied to every component
 * (themes/<name>/colors.toml); the bar, the menu, the windows, the terminal
 * the wallpaper all read from it. This does the same thing with CSS custom
 * properties, so switching a theme is one attribute write on <html> rather
 * than a reflow of hard-coded colours scattered across the stylesheets.
 *
 * The palettes below are transcribed from the official colors.toml files --
 * accent, background, dark_background, darker_background, lighter_background,
 * foreground, dark_foreground, and the eight ANSI colours. None of these
 * values were picked by eye.
 *
 * Wallpapers are Omarchy's own, cover-cropped to 720x720 and re-encoded as
 * WebP. They live on the device: the desktop has no CDN dependency, because a
 * phone with no network still has to boot into something.
 */

'use strict';

window.OB = window.OB || {};

window.OB.Theme = (function () {
  const K = window.OB.Kernel;

  /* Mode "dark" for every one of these, so no light theme yet. */
  const THEMES = {
    /* tcballard/omarchy-theme-tokyo-liftoff, installed with
     * `omarchy theme install tcballard/omarchy-theme-tokyo-liftoff`.
     * Its colors.toml is Tokyo Night's; the point of the theme is the
     * wallpaper set, which is what the desktop shows by default. */
    'tokyo-liftoff': {
      label: 'Tokyo Liftoff',
      colors: {
        accent: '#7aa2f7', selection: '#292e42', muted: '#414868',
        background: '#1a1b26', darkBackground: '#13141c', darkerBackground: '#0e0e14',
        lighterBackground: '#24283b',
        foreground: '#a9b1d6', darkForeground: '#565f89', lightForeground: '#b4bee6',
        brightForeground: '#c0caf5',
        red: '#f7768e', yellow: '#e0af68', orange: '#eb927b', green: '#9ece6a',
        cyan: '#449dab', blue: '#7aa2f7', magenta: '#ad8ee6', brown: '#75493d'
      },
      wallpapers: ['tl-sunset', 'tl-ascent', 'tl-golden', 'tl-engine']
    },

    'tokyo-night': {
      label: 'Tokyo Night',
      colors: {
        accent: '#7aa2f7', selection: '#292e42', muted: '#414868',
        background: '#1a1b26', darkBackground: '#13141c', darkerBackground: '#0e0e14',
        lighterBackground: '#24283b',
        foreground: '#a9b1d6', darkForeground: '#565f89', lightForeground: '#b4bee6',
        brightForeground: '#c0caf5',
        red: '#f7768e', yellow: '#e0af68', orange: '#eb927b', green: '#9ece6a',
        cyan: '#449dab', blue: '#7aa2f7', magenta: '#ad8ee6', brown: '#75493d'
      },
      wallpapers: ['tn-liftoff', 'tn-road', 'tn-quattro', 'tn-sunset']
    },

    catppuccin: {
      label: 'Catppuccin Mocha',
      colors: {
        accent: '#89b4fa', selection: '#45475a', muted: '#585b70',
        background: '#1e1e2e', darkBackground: '#161622', darkerBackground: '#101019',
        lighterBackground: '#313244',
        foreground: '#cdd6f4', darkForeground: '#6c7086', lightForeground: '#bac2de',
        brightForeground: '#cdd6f4',
        red: '#f38ba8', yellow: '#f9e2af', orange: '#f6b6ab', green: '#a6e3a1',
        cyan: '#94e2d5', blue: '#89b4fa', magenta: '#f5c2e7', brown: '#7b5b55'
      },
      wallpapers: ['ct-totoro', 'ct-waves', 'ct-eye']
    },

    gruvbox: {
      label: 'Gruvbox',
      colors: {
        accent: '#7daea3', selection: '#504945', muted: '#665c54',
        background: '#282828', darkBackground: '#1e1e1e', darkerBackground: '#161616',
        lighterBackground: '#3c3836',
        foreground: '#d4be98', darkForeground: '#7c6f64', lightForeground: '#bdae93',
        brightForeground: '#d4be98',
        red: '#ea6962', yellow: '#d8a657', orange: '#e1875c', green: '#a9b665',
        cyan: '#89b482', blue: '#7daea3', magenta: '#d3869b', brown: '#70432e'
      },
      wallpapers: ['gb-basket']
    },

    ethereal: {
      label: 'Ethereal',
      colors: {
        accent: '#89b4fa', selection: '#45475a', muted: '#585b70',
        background: '#1e1e2e', darkBackground: '#161622', darkerBackground: '#101019',
        lighterBackground: '#313244',
        foreground: '#cdd6f4', darkForeground: '#6c7086', lightForeground: '#bac2de',
        brightForeground: '#cdd6f4',
        red: '#f38ba8', yellow: '#f9e2af', orange: '#fab387', green: '#a6e3a1',
        cyan: '#94e2d5', blue: '#89b4fa', magenta: '#f5c2e7', brown: '#7b5b55'
      },
      wallpapers: ['et-cosmic', 'et-meadow']
    },

    'everforest': {
      label: 'Everforest',
      colors: {
        accent: '#a7c080', selection: '#3d4d3a', muted: '#5c6f5b',
        background: '#2d353b', darkBackground: '#232a2e', darkerBackground: '#1d2427',
        lighterBackground: '#3d4d3a',
        foreground: '#d3c6aa', darkForeground: '#859289', lightForeground: '#e6e2cc',
        brightForeground: '#e6e2cc',
        red: '#e67e80', yellow: '#dbbc7f', orange: '#d08770', green: '#a7c080',
        cyan: '#83c092', blue: '#7fbbb3', magenta: '#d699b6', brown: '#8f876f'
      },
      wallpapers: ['ef-trees']
    },

    /* Not an Omarchy theme: a true black option for terminal-heavy days,
       built from the same shape so every component still themes. */
    'matte-black': {
      label: 'Matte Black',
      colors: {
        accent: '#c8c8c8', selection: '#1c1c1c', muted: '#3a3a3a',
        background: '#0a0a0a', darkBackground: '#000000', darkerBackground: '#000000',
        lighterBackground: '#171717',
        foreground: '#d0d0d0', darkForeground: '#6b6b6b', lightForeground: '#b4b4b4',
        brightForeground: '#ffffff',
        red: '#e05561', yellow: '#d5a24a', orange: '#c98a5c', green: '#8fb573',
        cyan: '#57b6a8', blue: '#6f9fd8', magenta: '#b07fc0', brown: '#6b5b4a'
      },
      wallpapers: []
    }
  };

  const STORE = 'omaberry.theme';
  let current = 'tokyo-liftoff';
  let currentWall = null;

  function wallpaperUrl(name) {
    return name ? 'assets/wallpapers/' + name + '.webp' : '';
  }

  function apply(name, opts) {
    const theme = THEMES[name] || THEMES['tokyo-liftoff'];
    current = name in THEMES ? name : 'tokyo-liftoff';

    // A theme with no wallpaper of its own falls back to one that has any, so
    // switching never leaves a bare background behind.
    let wall = (theme.wallpapers && theme.wallpapers[0]) || 'tl-sunset';
    if (opts && opts.wallpaper && theme.wallpapers.indexOf(opts.wallpaper) >= 0) {
      wall = opts.wallpaper;
    }
    currentWall = wall;

    const c = theme.colors;
    const root = document.documentElement;
    const set = (k, v) => root.style.setProperty(k, v);

    set('--mocha-crust', c.darkerBackground);
    set('--mocha-mantle', c.darkBackground);
    set('--mocha-base', c.background);
    set('--mocha-surface0', c.lighterBackground);
    set('--mocha-surface1', c.selection);
    set('--mocha-surface2', c.muted);
    set('--mocha-overlay0', c.darkForeground);
    set('--mocha-overlay1', c.muted);
    set('--mocha-text', c.foreground);
    set('--mocha-subtext0', c.lightForeground);
    set('--mocha-subtext1', c.muted);
    set('--mocha-blue', c.accent);
    set('--mocha-sapphire', c.blue);
    set('--mocha-teal', c.cyan);
    set('--mocha-green', c.green);
    set('--mocha-yellow', c.yellow);
    set('--mocha-peach', c.orange);
    set('--mocha-red', c.red);
    set('--mocha-mauve', c.magenta);
    set('--mocha-pink', c.magenta);

    // The bar's active/inactive tints are alpha over whatever the theme's
    // background is, which is why they are recomputed per theme.
    set('--ob-bar-active-bg', hexAlpha(c.darkerBackground, 0.55));
    set('--ob-bar-inactive-bg', hexAlpha(c.darkerBackground, 0.28));
    set('--ob-bg-glass', hexAlpha(c.background, 0.74));
    set('--ob-bg-overlay', hexAlpha(c.darkerBackground, 0.94));

    root.setAttribute('data-theme', current);
    const rootEl = document.getElementById('desktop-root');
    if (rootEl) {
      rootEl.style.backgroundImage =
        'linear-gradient(' + hexAlpha(c.darkerBackground, 0.82) + ',' +
        hexAlpha(c.darkerBackground, 0.94) + '),' +
        'url(' + wallpaperUrl(wall) + ')';
    }

    // The terminal needs its own set: it reads ANSI variables, not the shell.
    document.documentElement.style.setProperty('--ansi-fg', c.foreground);
    ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'].forEach(function (k) {
      document.documentElement.style.setProperty('--ansi-' + k, c[k]);
    });

    if (!opts || opts.persist !== false) {
      try {
        localStorage.setItem(STORE, JSON.stringify({ theme: current, wall: wall }));
      } catch (e) { /* private mode; the theme just will not stick */ }
    }

    K.setState('theme', current);
    K.setState('wallpaper', wall);
    K.emit('theme:changed', { theme: current, wallpaper: wall, label: theme.label });
    return { theme: current, wallpaper: wall, label: theme.label };
  }

  function cycleWallpaper() {
    const theme = THEMES[current];
    if (!theme || !theme.wallpapers.length) return null;
    const i = theme.wallpapers.indexOf(currentWall);
    const next = theme.wallpapers[(i + 1) % theme.wallpapers.length];
    return apply(current, { wallpaper: next });
  }

  function hexAlpha(hex, alpha) {
    const h = String(hex).replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const r = parseInt(full.slice(0, 2), 16) || 0;
    const g = parseInt(full.slice(2, 4), 16) || 0;
    const b = parseInt(full.slice(4, 6), 16) || 0;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function init() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) {}
    apply((saved && saved.theme) || 'tokyo-liftoff', { wallpaper: saved && saved.wall });

    K.on('action:theme-next', () => {
      const keys = Object.keys(THEMES);
      const i = keys.indexOf(current);
      apply(keys[(i + 1) % keys.length]);
    });
    K.on('action:wallpaper-next', () => cycleWallpaper());
    K.on('action:theme-set', (d) => apply(d.theme, { wallpaper: d.wallpaper }));

    K.register('theme', { THEMES, apply, cycleWallpaper, get: () => ({ theme: current, wall: currentWall }) });
  }

  return { init, apply, THEMES, cycleWallpaper, wallpaperUrl,
           get: () => ({ theme: current, wall: currentWall }),
           list: () => Object.keys(THEMES) };
})();