# Native desktop 0.10.0

The reference is the local `omarchy-src` checkout at `246f33a2fef66411c990860d88e0823ae83987fc`, especially `default/hypr/bindings/{tiling,applications,utilities}.lua`, `default/hypr/looknfeel.lua`, and `default/omarchy/omarchy-menu.jsonc`.

On Q20, **hold the physical BlackBerry Menu key as Super**. Tapping and releasing Menu opens or dismisses the centered menu. The top-left OmaBerry logo does the same. A chord consumes its key and does not send the letter to a terminal or text field. Menu + trackpad motion focuses adjacent windows. Ctrl combinations need an external keyboard; the same main actions are available through the menu.

Physical acceptance on October 21: the user confirmed two Menu + Enter launches produce tiled terminals, Menu + W closes one and fills the freed space, and tapping Menu opens the centered menu. This confirmation applies to that sequence, not every binding listed below.

Following the 0.9.0 native payload update on October 21, the user also confirmed that holding Menu and pressing T opens a new shell tab. The native preview counter changed from 1 to 2 on touch and retained 2 after switching to the agent tab and back.

For 0.10.0, the user confirmed physical trackpad selection/commit of herdr's Chinese candidates, two Menu + T launches as desktop-level tiled shells, and Menu + 2 followed by hardware-keyboard input into an embedded webpage. This supersedes the earlier shell-tab behavior with the desktop-window behavior listed below.

| Shortcut | Native action |
| --- | --- |
| Super + Enter | New BerryCore terminal |
| Super + W / Q | Close the focused window and its PTY |
| Super + Space | OmaBerry menu |
| Super + Alt + Space | Applications |
| Super + Shift + F / N / A | Files / Notes / herdr |
| Super + Ctrl + Enter | Open or focus the herdr application |
| Super + T / Shift + T | New desktop shell / herdr agent session |
| Super + [ / ] | Previous / next herdr agent session |
| Super + U | Open the native UI preview |
| Super + B / L | Open Browser / replace its address |
| Alt + trackpad | Scroll content in the focused app |
| Super + J | Toggle the focused split's axis |
| Super + F | Fullscreen / restore |
| Super + arrows or Menu + trackpad | Focus neighboring window |
| Super + Shift + arrows | Swap neighboring windows |
| Alt + Tab / Alt + Shift + Tab | Next / previous window |
| Super + 1…9, 0 | Workspace 1…10 |
| Super + Shift + number | Move window and follow it |
| Super + Shift + Alt + number | Move window without following |
| Super + Tab / Shift + Tab | Next / previous workspace |
| Super + Ctrl + Tab | Previous active workspace |
| Super + - / = | Shrink / grow parent split; Alt half step, Ctrl double step |
| Super + K | Shortcut list |
| Super + Escape | System menu |
| Super + Shift + Space | Toggle top bar |
| Super + Ctrl + Space | Next Tokyo Liftoff wallpaper |
| Super + Backspace / Shift + Backspace | Transparency / gaps |

Each new window splits the focused rectangle equally along its longer axis. Splits retain their axis; closing a leaf collapses its parent. There are ten workspaces and sixteen stable window/PTY slots shared across them. Fullscreen restores the same tree. There are no window-manager titlebars, close buttons, global bottom status strip, wordmark or wallpaper label. The herdr view has its own compact project/tab status line. First wallpaper is Liftoff Sunset.

The agent uses DeepSeek function calls with actual local `run_shell`, `read_file`, `write_file`, `desktop`, `herdr`, `browser` and `native_ui` tools. Shell commands run as the app user, use BerryCore's PATH, have a 1–60 second deadline, return stdout/stderr and exit code, and can be cancelled. File writes are replacements up to 64 KiB, using atomic rename on ordinary filesystems. QNX /tmp resolves to /dev/shmem, which does not support rename; there the tool reports atomic=false and writes directly. Desktop tools inspect/open/focus/close windows, switch workspaces, change splits/fullscreen and adjust wallpaper/gaps/bar/opacity. API credentials remain in private configuration and are scrubbed from tool results. One agent request runs at a time; other herdr agent sessions keep independent histories. herdr has its own projects and agent-session selection. Its **+ shell** action and Menu + T open a desktop window in the selected project directory. Its **+ agent** action creates a session inside herdr. The desktop's 1–10 workspaces only own window layouts. Closing herdr preserves its conversation excerpts; reopening it returns to the same project/session. Legacy 0.9 layouts migrate their shell tabs into desktop tiles and consolidate chat windows into herdr while retaining stored histories.

Trackpad motion uses a dominant axis, small-movement accumulation and a 70 ms repeat limit. During Pinyin composition it moves the highlighted candidate; clicking commits. In a terminal it sends cursor/history arrows and clicking sends Return. In the browser it moves a visible pointer and clicks page content. Menu + trackpad changes desktop focus; Alt + trackpad scrolls. Touch input retains the same active application ownership.


This is a native adaptation. Upstream herdr's Rust daemon, SSH hosts, detached session CLI/socket protocol, reboot recovery and arbitrary third-party agent detection are not ported. Desktop layouts and herdr sessions, live UI source/state, wallpaper, desktop style and bounded chat excerpts persist. Terminal processes and Notes last for the app process lifetime. Omarchy's Linux package management, floating/grouped windows and compositor-specific utilities are not represented as working features. The built-in agent edits live PocketJS `ui.js` modules through `native_ui`; main JSX/native-host/resource-pack rebuilding is still a desktop build operation. See [Native live UI](NATIVE-LIVE-UI.md).
