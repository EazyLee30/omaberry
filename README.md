<div align="center">
  <img src="docs/icon.png" alt="OmaBerry logo" width="112" height="112">
  <h1>OmaBerry</h1>
  <p><strong>A native PocketJS tiling desktop for BlackBerry Classic / Q20.</strong></p>
  <p>BB10 / QNX · BerryCore shell · DeepSeek agents · Omarchy-inspired keyboard controls</p>
  <p>
    <img alt="Version" src="https://img.shields.io/badge/native-0.10.0-a9dc62?style=flat-square">
    <img alt="Runtime" src="https://img.shields.io/badge/runtime-PocketJS-7aa2f7?style=flat-square">
    <img alt="Platform" src="https://img.shields.io/badge/platform-BB10%20%2F%20QNX-c0caf5?style=flat-square">
    <a href="LICENSE"><img alt="Code license" src="https://img.shields.io/badge/code-MIT-9ece6a?style=flat-square"></a>
  </p>
  <p><a href="#desktop">Desktop</a> · <a href="#keyboard">Keyboard</a> · <a href="#build-and-install">Build</a> · <a href="native/README.md">Native development</a></p>
</div>

OmaBerry runs directly as a native BB10 application. PocketJS renders the desktop and connects it to QNX input, PTYs, files and processes through native bindings. **The desktop uses PocketJS native controls, with no HTML shell, localhost web server or Node.js service.** The Browser application embeds the system WebKit engine into a native desktop tile.

OmaBerry 现已完全转向 **PocketJS 原生桌面**：在黑莓 Q20 上直接运行终端、文件管理、中文聊天和本地 agent 工具。左上角 OmaBerry logo 打开居中菜单；新窗口递归平铺，实体 Menu 键作为 Super 使用。

## Desktop

<p align="center">
  <img src="docs/native-home.png" alt="OmaBerry native desktop with its green logo and Liftoff Sunset wallpaper, captured on a Q20" width="360">
  <img src="docs/native-four.png" alt="Four independent native BerryCore terminals in a recursive tiled layout on a Q20" width="360">
</p>

Actual 720 × 720 Q20 framebuffer captures. The default wallpaper is **Liftoff Sunset**, the first artwork from Tokyo Liftoff.

| Feature | Available in the native app |
| --- | --- |
| Tiling desktop | Ten workspaces, up to sixteen windows, recursive half splits, focus/swap, resize, fullscreen and collapse on close |
| Terminal | Independent BerryCore PTY shells; working directories and running processes survive workspace switches |
| Files | Browse directories, filter names and read paginated text previews directly from the device |
| herdr | Independent projects and DeepSeek agent sessions inside one application window; CJK candidate rendering and offline Pinyin selection |
| Local agent tools | Execute shell commands, read/write files, inspect and change the live desktop |
| Browser | Native WebKit pages composited inside desktop tiles; URLs, history, JavaScript, forms, touch, trackpad and agent controls |
| Live native UI | Agents edit `ui.js`, apply native View/Text/Button trees, verify presented revisions and undo changes |
| Notes | A scratchpad for each Notes window |
| Theme | Tokyo Night colors, thin focus borders, translucent panes and four Tokyo Liftoff wallpapers; wallpaper and style settings persist |

Each new window splits the focused pane in half along its longer dimension. Closing a pane lets its neighbor fill the freed area. The desktop has no window-manager titlebars or close buttons; click the top-left logo for the [centered menu](docs/native-menu.png), or use the keyboard.

## herdr and live UI

<p align="center">
  <img src="docs/native-herdr.png" alt="Native herdr application with projects and agent sessions on Q20" width="360">
  <img src="docs/native-ui.png" alt="A native PocketJS UI module edited by the on-device DeepSeek agent" width="360">
</p>

herdr is a desktop application. Its projects and agent sessions are independent of the numbered system workspaces. New shells and UI previews are separate desktop windows and use the same recursive tiling as other applications.

The agent edits actual `ui.js` source on the phone. PocketJS displays the resulting native controls, confirms frame presentation and keeps the last good version if a change fails. See [the live UI workflow](docs/NATIVE-LIVE-UI.md).

## Browser

<p align="center"><img src="docs/native-browser.png" alt="Actual WebKit page and input field rendered inside a PocketJS desktop tile" width="360"></p>

Press **Super + B**, then **Super + L** to enter an address. Webpages stay in their desktop tile. Tap a page to focus it; the trackpad moves the page pointer, its click activates, and Alt + trackpad scrolls. The native logo menu overlays the page.

## Keyboard

On the Q20, **hold the physical BlackBerry Menu key to use it as Super**. Tap and release Menu to open or dismiss the menu.

| Shortcut | Action |
| --- | --- |
| Super + Enter | Open a new terminal |
| Super + W / Q | Close the focused window |
| Super + Space | Open the centered OmaBerry menu |
| Super + Alt + Space | Applications |
| Super + arrows / Menu + trackpad | Focus a neighboring pane |
| Super + Shift + arrows | Swap panes |
| Super + J | Toggle the split direction |
| Super + F | Fullscreen / restore |
| Super + 1…9, 0 | Switch to workspace 1…10 |
| Super + Shift + number | Move the focused window to a workspace |
| Super + Shift + F / N / A | Files / Notes / herdr |
| Super + Ctrl + Enter | Open or focus herdr |
| Super + T / Shift + T | New desktop shell / herdr agent session |
| Super + [ / ] | Previous / next herdr agent session |
| Super + U | Native UI preview |
| Super + B / L | Open Browser / edit its address |
| Alt + trackpad | Scroll the focused terminal, chat, file preview or webpage |
| Super + K | Show shortcut help |

See the [full native shortcut map](docs/NATIVE-SHORTCUTS.md) for workspace cycling, resizing and theme controls. Ctrl chords require a suitable external keyboard; menu actions are also available.

## Native architecture

```text
Q20 keyboard / trackpad / touchscreen
                  │
       BB10 / QNX native host
       input · lifecycle · rendering
                  │
    PocketJS / QuickJS + native renderer
       TypeScript / Solid JSX desktop
                  │
          Native C bindings
     ┌────────────┼─────────────┐
     PTYs     files/processes  HTTPS child transport
     │            │             │
 BerryCore    local tools    DeepSeek API
```

The UI is written in TypeScript and Solid JSX and compiled for PocketJS's native renderer. The desktop and live UI do not use a DOM. Web content is rendered separately by BB10 WebKit into textures clipped to Browser tiles. Terminal and file operations use native APIs; DeepSeek requests use BerryCore's `curl` with certificate verification.

The built-in agent can use `run_shell`, `read_file`, `write_file`, `desktop`, `herdr`, `browser` and `native_ui`. Commands run with the app's permissions and return their actual output and exit status. The desktop tool can open/focus/close panes, change workspaces and splits, and adjust supported theme settings. Stop cancels an active request and its command process.

In herdr, ask **“把原生预览标题改成你好，强调色改成绿色，保留计数按钮并应用”**. The agent reads the device workspace’s `ui.js`, edits the source, and opens its live PocketJS preview. `native_ui apply` waits for native frame presentation before reporting success. Invalid source retains the last accepted view; **Undo** restores the previous source. See the [live native UI guide](docs/NATIVE-LIVE-UI.md).

API credentials are provisioned separately in private application data. They are not included in the source, UI assets or BAR. Chat and tool results needed for a task are sent to the configured DeepSeek service; the desktop, terminal and file browser work without an AI connection.

## Build and install

This is a development build for a BB10 device with BerryCore installed. The build has been exercised on macOS with Bun, Python 3, Git, Rust and Docker. PocketJS and the BBNDK container are pinned.

```sh
git clone https://github.com/EazyLee30/omaberry.git
cd omaberry
python3 scripts/native.py prepare
```

Follow the [toolchain setup and device installation guide](native/README.md#build) before the first build, then run:

```sh
python3 scripts/native.py build
```

Outputs:

- `out/native/pocketjs-blackberry-classic-hero.bar` — native BB10 application.
- `out/native/build-receipt.json` — build identity and artifact hashes.

The filename and package ID retain the PocketJS development identity so existing app data survives updates. The installed application is named **OmaBerry** and uses the green OmaBerry icon. Install the BAR with a working BB10 deployment path, allow Shared Files when prompted, and launch it from its phone icon.

See [native development](native/README.md) for private DeepSeek configuration, source layout, build prerequisites and checks. No browser installation step is involved.

## Current limits

The embedded browser uses BB10’s system WebKit, not BerryBrowser’s Chromium engine. Modern JavaScript, CSS, TLS or certificate requirements can exceed its capabilities. Four browser pages can be open at once; they share the desktop’s sixteen-window limit.

Basic webpage text fields use an isolated DOM text-commit bridge. Cross-origin frame editing, custom keyboard-driven editors, downloads, popups and system form dialogs are not covered. Fixed-width sites may still need wider tiles.

This is an independently implemented native adaptation of Omarchy and herdr, with further parity work ahead.

- Desktop layouts, herdr projects/sessions, browser URLs, live UI source/state, wallpaper and style persist across launches. Webpage DOM state is retained during workspace switches, but pages reload after a full app restart. Each chat saves up to 24 recent message excerpts (500 characters each). Shell processes and Notes remain tied to the app process; reopening a saved shell starts a new PTY.
- The terminal handles a basic monochrome VT subset. Alt + trackpad browses up to 600 retained lines. Full terminal emulation and arbitrary full-screen terminal programs are not yet covered.
- The built-in Pinyin composer is available in herdr. It does not switch the BB10 system input method.
- One built-in agent task runs at a time. Upstream herdr's daemon, detached CLI/socket protocol, SSH host orchestration and external-agent detection are not implemented.
- Live `ui.js` modules can change native component trees, button state and herdr theme colors. Recompiling the main TSX desktop, native C host or baked resource pack on the phone is not implemented. The agent receives the validated tree and presentation revision, not screenshot vision.
- The app runs within BB10; it does not install Hyprland or replace the phone OS.

The older `web/`, `server/`, `sim/` and browser packaging scripts are retained as historical source. They are outside the active native runtime and build path. Development now targets `native/` and `scripts/native.py`.

## Credits

- [PocketJS](https://github.com/pocket-nexus/pocketjs) — native runtime and compiler, pinned to `3d0983769f62ac75bacd62b723c15202425b2dd1`.
- [Omarchy](https://github.com/omacom/omarchy) and [Omarchy Mobile](https://github.com/derekross/omarchy-mobile) — keyboard, menu, tiling and visual references.
- [herdr](https://github.com/herdrdev/herdr) — workspace and agent interface reference.
- [Tokyo Liftoff](https://github.com/tcballard/omarchy-theme-tokyo-liftoff) — theme and wallpaper artwork. See the retained [artwork credits](native/src/Tokyo-Liftoff-CREDITS.txt) and [theme license](native/src/Tokyo-Liftoff-LICENSE.txt).
- Noto Sans SC — common Chinese glyphs, under the included [SIL Open Font License](native/src/OFL-NotoSansSC.txt).
- BerryCore — the device's shell tools and HTTPS transport.

The [OmaBerry logo](docs/logo.png) is the project owner's supplied artwork, used consistently in the native top bar, menu, application icon and this README. [Brand asset details](docs/BRANDING.md).

OmaBerry code is [MIT licensed](LICENSE). Third-party assets retain their own licenses and source attributions. Implementation and device verification history is recorded in [NATIVE-MIGRATION.md](docs/NATIVE-MIGRATION.md).
