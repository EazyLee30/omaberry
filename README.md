<p align="center"><strong>OmaBerry</strong></p>
<p align="center"><em>The keyboard remembers. The desktop returns.</em></p>

<p align="center">
<img alt="Device" src="https://img.shields.io/badge/BlackBerry-Classic_%2F_Q20-252522?style=flat-square">
<img alt="System" src="https://img.shields.io/badge/BB10-QNX_%2B_BerryCore-75404b?style=flat-square">
<img alt="Inspired" src="https://img.shields.io/badge/Inspired_by-Omarchy-494e42?style=flat-square">
<img alt="Status" src="https://img.shields.io/badge/Status-v0.1_Preview-b39360?style=flat-square">
</p>

# OmaBerry

Omarchy-inspired keyboard-first desktop environment for BlackBerry Classic / Q20,
running on BB10 / QNX / BerryCore.

**Not a Linux port. Not a theme.** A real desktop shell that runs native BerryCore
commands, manages workspaces, and puts Q20's physical keyboard at the center of
every interaction.

## What it is

- **Desktop shell** — status bar, workspaces, tiling launcher, all in 720×720
- **Keyboard-first** — every action reachable from Q20's QWERTY + trackpad + physical buttons
- **Native terminal** — PTY bridge to BerryCore shell, not a web terminal emulator
- **File manager** — browse, read, edit files on device
- **Agent hub** — connect to external AI agents via SSH or API
- **Omarchy visual language** — dark theme, monospace, minimal chrome, gap-tiled
- **Offline-first** — core desktop works without internet
- **Recoverable** — install, uninstall, upgrade; never touches BB10 kernel

## Architecture

```
┌─────────────────────────────────────┐
│         BlackBerry Q20 Hardware     │
│   QWERTY · Trackpad · Touch · Keys │
├─────────────────────────────────────┤
│         BB10 / QNX Kernel           │
├─────────────────────────────────────┤
│         BerryCore                   │
│   Node.js 22 · Git · SSH · qpkg    │
├─────────────────────────────────────┤
│         OmaBerry Server (Node)      │
│   WebSocket · PTY · FS · SysInfo   │
├─────────────────────────────────────┤
│         Berry Browser (Chromium 120)│
│   OmaBerry Desktop Shell           │
│   ┌───────────────────────────────┐ │
│   │ StatusBar · Workspaces · Dock │ │
│   │ Launcher · Terminal · Files   │ │
│   │ Keyboard Handler · Gestures   │ │
│   └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Quick Start

### Prerequisites

On Q20 (with BerryCore installed):

```sh
qpkg install node-term49
node --version   # must be v22.x
```

### Install

From your computer:

```sh
scp -r omaberry bb10:/accounts/1000/shared/misc/omaberry
ssh bb10 'sh /accounts/1000/shared/misc/omaberry/scripts/install.sh'
```

### Launch

In Term49 or SSH:

```sh
omaberry
```

Then open Berry Browser → `http://127.0.0.1:9820`

## Q20 Input Map

OmaBerry maps every physical input on Q20:

| Input | Desktop | Terminal | Launcher |
|-------|---------|----------|----------|
| Alt+T | Open terminal | — | — |
| Alt+L | Open launcher | Exit → Launcher | — |
| Alt+F | Open files | Exit → Files | — |
| Alt+1–4 | Switch workspace | Switch workspace | — |
| Alt+Q | Close window | Close tab | Close |
| Alt+Enter | Toggle fullscreen | Toggle fullscreen | Launch |
| Alt+Space | Command palette | — | — |
| Alt+H/J/K/L | Focus ←↓↑→ | — | — |
| Trackpad | Cursor / Scroll | Scroll buffer | Navigate items |
| Trackpad click | Select | — | Launch selected |
| Back key | Close overlay | Unfocus terminal | Close launcher |
| Menu key | Context menu | Terminal menu | — |
| Type anything | — | Input to shell | Filter search |
| Swipe ← from right | Quick settings | — | — |
| Swipe → from left | Show launcher | — | — |

Full mapping in [`web/js/keys.js`](web/js/keys.js).

## Project Structure

```
omaberry/
├── server/
│   ├── index.js           Main server (HTTP + WebSocket)
│   ├── pty-bridge.js      Terminal PTY bridge
│   ├── fs-api.js          Sandboxed file system API
│   └── sys-api.js         System information
├── web/
│   ├── index.html         Desktop shell
│   ├── css/
│   │   ├── tokens.css     Omarchy design tokens
│   │   ├── desktop.css    Desktop layout
│   │   ├── terminal.css   Terminal styles
│   │   └── launcher.css   Launcher styles
│   └── js/
│       ├── kernel.js      Event bus & state management
│       ├── keys.js        Keyboard, trackpad & gesture handler
│       ├── desktop.js     Desktop shell controller
│       ├── statusbar.js   Status bar (clock, battery, wifi)
│       ├── workspace.js   Workspace manager (4 virtual desktops)
│       ├── launcher.js    App launcher with search
│       ├── terminal.js    Terminal emulator renderer
│       └── filemanager.js File browser
├── scripts/
│   ├── install.sh         Install to BerryCore
│   ├── uninstall.sh       Clean removal
│   └── preflight.sh       Pre-flight system checks
└── test/
    ├── test-keys.html     Interactive keyboard test page
    └── test-server.js     Server unit tests
```

## Design Language

Derived from Omarchy's visual system, adapted for 720×720:

- **Background**: `#0d1117` → `#161b22` (dark blue-gray)
- **Surface**: `#21262d` with `#30363d` borders
- **Accent**: `#58a6ff` (blue), `#3fb950` (green), `#f78166` (orange)
- **Font**: JetBrainsMono Nerd Font → system monospace fallback
- **Chrome**: Minimal — no window decorations, 8px rounded corners, 4px gaps
- **Bar**: 28px status bar at top, translucent

## What it is NOT

- Not Arch Linux or official Omarchy
- Not a Linux kernel replacement for BB10
- Not Hyprland / Wayland / X11
- Does not replace BB10 home screen at OS level
- Does not require reflashing or bootloader changes

## Related Projects

- [reberry](https://github.com/EazyLee30/reberry) — Q20 recovery and BerryCore setup
- [berrycode](../berrycode) — ChatGPT + Codex on BB10
- [berrybrowser-cjk](https://github.com/EazyLee30/berrybrowser-cjk) — CJK font patch for Berry Browser
- [BerryCore](https://github.com/sw7ft/BerryCore) — Unix shell environment for BB10
- [Omarchy](https://github.com/omaranstudio/omarchy) — The original inspiration

## License

MIT. BlackBerry trademarks belong to their respective owners.
Omarchy design language used with attribution to Oman Studio.
