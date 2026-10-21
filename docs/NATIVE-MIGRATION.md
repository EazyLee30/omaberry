# OmaBerry native migration

Current development is **PocketJS native only**. Version 0.8.1 uses the supplied OmaBerry logo in the top-left menu trigger and BB10 launcher. The desktop has ten workspaces, recursive tiling, BerryCore PTYs, Files, Notes, Chinese Chat, local DeepSeek tools and a herdr workspace sidebar. The old browser app was removed from the development phone; browser sources remain historical.

This document is a chronological verification record. Descriptions under older versions refer to those versions, not the current interface. Use the [project README](../README.md), [native guide](../native/README.md) and [shortcut map](NATIVE-SHORTCUTS.md) for current behavior.

## Reproducible source and build

The pinned revision, complete patch, build commands and acceptance checks are in [native/README.md](../native/README.md). `scripts/native.py` prepares a persistent ignored checkout and copies BAR/receipt outputs into `out/native`. The OpenCode temporary checkout is no longer required.

P0 established the BBNDK Docker → Rust/QuickJS → ARM ELF → BAR build path and an initial Hero rendering on the Q20. The text input changes extend the C runtime with a bounded UTF-8 queue, passed after the guest's eight existing frame parameters. The ninth argument feeds a guest latch through `framework/src/text-input.ts`.

The input preview now accepts space, normalizes QNX Backspace and Return, rejects navigation symbols, removes complete Unicode scalars, and records a guest `text_input` action. It uses `onFrame` rather than an untransformed asynchronous polling loop. The devtools frame wrapper forwards argument 9; the previous wrapper discarded text before it reached the guest latch. Host startup status distinguishes graphics initialization and runtime boot.

## Evidence boundaries

Build, install, process launch, frame presentation, host keyboard events and guest text consumption are distinct checks. A stopped status file from an older build does not establish the behavior of a newly installed build. Use `build_id` and the receipt to identify the tested binary.

Earlier notes claimed that direct pathtrust registration never worked and that a persistent flash flag was the only remaining route. Those conclusions were not established. During the October 19 recovery, registering the existing node binary and its shared libraries through a functioning root bridge allowed Node 22 to run. The BerryCore wrapper also failed when its `dirname` dependency could not execute; `scripts/run-qnx.sh` invokes the binary without that dependency. No persistent debug flag is needed by the project launch path.

## Initial native milestones (historical, October 19)

1. Verify Space, Backspace and Return on the device; ASCII typing and guest consumption are verified.
2. Validate the Desk / Notes / Status prototype on the device, including focus navigation and draft retention.
3. Add a native transport to the existing shell, file and agent services.
4. Implement terminal rendering, CJK glyph coverage and composition.
5. Reconcile the extended input contract/profile with upstream and validate lifecycle, resume, trackpad and delivery.

The portable button mask is retained alongside text. Space still maps to the existing game button, while text consumers receive a space. This preview does not introduce an incompatible struct layout for other hosts.

## October 19 validation

The browser service runs on the Q20 at loopback port 9820. HTTP delivery and the Agent WebSocket were checked through an SSH tunnel. A local mock provider completed a Chinese-text UI round trip. The real MiMo request returned HTTP 402; the service remained available. The native `http/https` transport avoids the `fetch`/WebAssembly crash in BerryCore's `--jitless` runtime.

Native preview 0.1.4 built with SHA-256 `07cc01a8597f08509f5d4d0441c78dbc11c0cd5e4ea3ce27dafef2e553d6b5d9` and installed with `result::success`. Its status identifies build `93c55e9456edc3c898bc7524c3f8b767` and reached `stage=running`. Physical ASCII typing is verified for this build: the user confirmed that typing `abc` changes the headline to `abc`. Device status records 1516 frames, 60 keyboard events, 30 host text events, `last_text=U+0063`, and the guest action `text_input` with value 30. The subsequent inactive state records the window moving to the background. An earlier build received host key events but discarded the ninth argument in the devtools wrapper.

Server, Agent receipts, WebSocket close/ping, jitless HTTP, guest text-buffer and frame-wrapper tests pass. A C input-normalization test passes with `-Wall -Wextra -Werror`, and the complete patch applies to a clean snapshot of the pinned source.

## Native desktop prototype 0.2

The Hero layout is replaced by an OmaBerry start page, a Notes page and a runtime-status page. `native/src` holds the application source; the pinned PocketJS patch contains the host and framework changes. Notes accepts text only while its page is selected, keeps a bounded session draft across page changes, and supports Clear. Return activates focused controls without inserting spaces. No shell or model execution is implied by the interface.

The native prototype supports a foreground-app framebuffer capture for layout verification; this is development evidence, not a screen capture of other apps. Runtime receipts and screenshots remain ignored artifacts.

Native 0.2.1 built with SHA-256 `2cdee259520ec4ba5cdf21987f1563405558615e7ae6be0fd5acf3c826493499` and installed with `result::success`. A clean single-instance launch was checked. GPU framebuffer readback after `glFinish` and the software-rendered scene both contain the complete Desk layout; unsynchronized readbacks had produced partial or blank diagnostic images. Synchronization is limited to explicit captures/startup evidence, not the normal presentation loop. The Notes input-gating, Unicode backspace, Enter behavior and Clear logic pass automated tests. Physical Notes input, Backspace and cross-page draft retention are verified: the user typed `abc`, deleted `c`, switched to Desk and back to Notes, and confirmed `ab` remained. Build `d43168708b8532e792b30d269c9e52f7` recorded 1079 frames, 8 keyboard events, 4 text events, last text U+0008, and `desktop_page=1` on return to Notes. Clear, Space and Enter still need separate physical acceptance.

`python3 scripts/native.py launch` closes only processes whose command exactly matches the prototype package identity and requests a clean launch. Old native development instances had survived package replacement, so package installation alone is not used as a restart guarantee. Restarting discards session-only notes.

## October 20 native terminal

Native 0.3 adds a direct PTY bridge to `/bin/ksh` and BerryCore's environment. `native/host` contains the terminal core and QuickJS binding, copied by `scripts/native.py`; the pinned patch installs the binding, routes focused terminal keys, and requests Shared Files permission. Notes no longer consumes input while inactive, allowing the terminal to use the same bounded host text queue. Return and Space no longer activate navigation controls while the terminal captures the keyboard. Menu returns control to navigation.

The screen is a bounded 42×11 monochrome grid with basic ANSI cursor/erase handling. The shell process survives page switches, with output consumed each frame even while Term is hidden. Restart and runtime shutdown close the session. This is not complete VT/full-screen/CJK support.

Device evidence: the app displayed real command output for `pwd` and `whence python3`; Python returned `True` for `os.isatty(0)`. Shared Files permission was required and the user confirmed allowing it. The diagnostic screen showed the shared working directory and BerryCore Python path. Initial PTY linkage through the non-PIC archived libc object prevented launch; the final bridge uses QNX's dynamic process/TTY primitives instead. Diagnostic commands are confined to a temporary test guest and are removed from the deliverable.

Final 0.3.0 BAR SHA-256: `be441dbe976307929b035e6a6578ef8651a941d40a2815ee19b16074fb70727d`; build `7522bb05ca38038cf0a677e548166f8b`. Installer returned `result::success`, the installed guest hash matches the build receipt, and the final app reached `stage=running`. The final ELF has no text relocations.

Physical acceptance for native 0.3.0: the user entered `cd /tmp`, pressed Return, used Menu to navigate to Desk and back to Term, then entered `pwd`. The user confirmed output `/tmp`. This verifies physical command input, Return, Menu navigation and preservation of the live shell working directory across page changes.

## October 20 native file browser 0.4

Files browses the BerryCore directory through a direct native read-only API. It sorts folders first, follows symbolic links for browsing/reading, and pages both directory rows and text previews. File contents are bounded to 64 KiB; binary and special files have distinct handling. Navigation and preview state survive switches to other native pages, without consuming terminal or Notes input.

Portable C tests cover real directory listing, hidden entries, links, text/binary reads, missing/special files and a bounded UTF-8 cut. Controller tests cover paging, parent/home navigation, paths with spaces, Unicode wrapping and error views. On the Q20, the temporary diagnostic guest traversed `etc`, returned to BerryCore and opened the real README; status recorded `files_open=2066` and the framebuffer showed file content and page 1/9.

0.4.0 BAR SHA-256: `c39bb5adbc797af870beed5fbba648245e015b7cc129a3b1e1a9cad60c6a5d1b`; build `2ee07b114ff7a1ac0b12dc29e11afd75`. Installer returned `result::success`.

The final 0.4 guest adds case-insensitive filename filtering from the physical keyboard. Back clears the filter, and directory changes clear it automatically. Search uses page-gated text input, preserving the existing Notes and terminal input paths.

Final install verification: the application reached `stage=running`; both installed guest JavaScript and font-pack hashes match the final build receipt. The normal guest starts at Desk and has no automatic file-opening diagnostics.

Physical acceptance for native Files 0.4.0: the user opened Files, typed `readme`, selected and opened README, used Next to read another page, and used Back to return to the list. The user confirmed all steps worked. This verifies physical filename filtering, file selection/opening, preview pagination and return navigation.

## Native 0.5: DeepSeek and herdr

The native app adds DeepSeek chat plus a Q20 adaptation of herdr's workspace interface. Three independent PTYs retain their working directories and screens, while drafts/history are isolated per workspace. The existing terminal input capture still releases with Menu. Notes/Status move to Desk so the primary navigation fits the display.

DeepSeek transport uses the existing trusted BerryCore curl binary, verified HTTPS, an unlinked private config on stdin, separate nonblocking output/error pipes, bounded response buffering, cancellation and timeout. Credentials live in the app's private data directory, outside the distributable. Only explicit chat text/context is sent; no file or shell tools are exposed to the model. The provider model list was queried successfully with the user's key and returned deepseek-flash/deepseek-v4-pro.

The herdr view is a native workspace adaptation, referenced against herdrdev/herdr; it does not claim that the upstream Rust runtime or agent CLIs were ported. Tests cover actual simultaneous PTYs, working-directory isolation, background AI replies associated with their originating workspace, context, provider refusal, cancellation, response limits and Chinese text wrapping.

Device verification for 0.5: a native DeepSeek completion returned a real 24-character reply (`chat_reply=24`). The native UI rendered the Chinese diagnostic prompt with Noto glyphs. A temporary guest ran three PTYs and checked their output for distinct working directories `/`, `/tmp`, and `/accounts/1000/shared/misc/berrycore`; status recorded `herdr_isolated=3`. The corrected herdr sidebar layout was inspected on the native framebuffer. These automatic diagnostics are absent from the final guest.

Final 0.5.0 BAR SHA-256: `95167946fcb990d33dd811d66dcd7b12e32b00cba71c13d0a8df2b5e6d6c3963`; build `cd179cafdd79c30488a9f163f40b07e6`. The packaged guest contains neither the key nor diagnostic submissions.


## Native 0.5.1: offline Chinese input

Physical 0.5.0 acceptance: the user confirmed DeepSeek chat works and Chinese replies display correctly; Chinese typing was missing. Version 0.5.1 adds a local Pinyin composer to Chat, with CN/ABC switching, visible candidates, Space/Enter commit, digit/arrow selection and Unicode backspace. C host input suppresses navigation activation while composing so Enter confirms the candidate. Draft and preedit state are independent for Main, Build and Scratch. The dictionary is packaged as a JSON asset, keeping candidate text out of the compiler's general font slots.

Final 0.5.1 BAR SHA-256: `52d841c9cd8ce59d744ab8a317a3c2f022036ded2064d84c029654da3c1ee4f1`; build `3c61b56f77c2f8d445d56ff78968383a`. Installer returned `result::success`. A temporary native guest loaded the packaged dictionary, composed and committed 你好 (`ime_verified=2`), and displayed the 中文 candidate for `zhongwen`; the actual framebuffer was inspected. The diagnostic guest was removed and the installed JS/PAK restored to the production receipt hashes. Physical 0.5.1 acceptance passed: the user confirmed typing 你好, sending it, and receiving a reply.


## Native 0.6.0: Tokyo Liftoff desktop

The user prioritized the Tokyo Liftoff wallpaper and Omarchy-inspired phone desktop. The native home now has a full-screen wallpaper, compact workspace/clock bar, and terminal/files/chat/notes/herdr dock. Four upstream artworks are resized proportionally and center cropped to 1024×1024, then split into four 512×512 texture tiles for sharp rendering over the Q20’s 720×720 screen; the wallpaper button cycles the set and saves the choice atomically in the application's private data directory. App panels use the upstream Tokyo Night palette. Artwork provenance, source hashes and crop description are in native/tokyo-liftoff-assets.json; upstream credits and license notices are included in the BAR.

The user also rejected the current herdr implementation as an accurate port. This remains an open requirement. The current herdr view is a three-workspace launcher; upstream has a terminal multiplexer with pane splits, a detached session server, saved layouts, remote machines, agent status detection and a CLI/socket API. Neither its visual appearance nor its runtime behavior is at 1:1 parity. The wallpaper release does not satisfy that requirement. Native host and guest screenshots should be compared against the upstream screenshot only after the multiplexer UI and runtime work is complete.

Final 0.6.0 BAR SHA-256: `14f2be106a7fea1ff8831f52ba4c881184e808cda8896022077a7db121d66fe2`; build `a6999022213ea4ea11fccb872a6f07da`. PPS installer returned `result::success`. The actual 720×720 framebuffer shows the full-screen Liftoff Sunset wallpaper, Tokyo Night bar and five native app launchers. All 16 baked wallpaper texture payloads match source tiles, and the installed guest hashes match the final receipt. The user confirmed wallpaper cycling; an initial report that persistence failed was explicitly corrected to “保存了，我点错回答了”. Wallpaper persistence is therefore physically accepted. App launcher acceptance was not separately confirmed.


## Native 0.7.0: Omarchy mobile style and tiling

The shared desktop now follows the supplied Omarchy mobile references: a compact workspace/clock bar, monospace labels, original pixel wordmark, thin blue focus borders, dark translucent window backgrounds, and a searchable Applications panel over the saved Tokyo Liftoff wallpaper. This is the native Q20 application, not a Hyprland installation. The upstream mobile reference was inspected at derekross/omarchy-mobile revision `f1885a79a1709c8387ad32798c00cfc8f16afabd`; its “Show with…” flow informs the native + Tile action.

Four independent workspaces can each show two vertically stacked native windows. Title/content focus routes physical text to the correct app, [] maximizes, = restores, x hides the pane, and Menu opens the keyboard-searchable launcher even from a focused shell. A focus scope keeps the open launcher from activating background controls. Controls support touch and trackpad selection. Two Terminal windows use separate PTYs; shell slots survive hiding/workspace changes until application exit. Files, notes and Chinese chat have workspace-local state. File pagination and chat output adapt to available height.

Automated checks cover workspace isolation, stable terminal slots after closing/reopening, focus, maximize/restore, bounded non-overlapping geometry, dynamic file paging, Pinyin, chat context/errors, and text routing. Portable C tests open eight real PTYs and check TIOCGWINSZ after resize. On-device diagnostics ran two shells with /tmp and / as separate working directories and received `6 42` from stty in the tiled layout (`tiling_verified=2`). Maximizing reported `19 42` (`resize_verified=19`). Actual framebuffer captures show both shells, a split BerryCore README preview, and 你好 plus the 中文 Pinyin candidate.

Remaining herdr parity work: upstream daemon/CLI/socket interfaces, remote SSH hosts, agent detection, saved layouts and arbitrary nested pane trees. The current release adds native two-pane behavior, but does not claim full 1:1 herdr parity. Layout and application session state are in-memory; the wallpaper selection retains its existing disk persistence.

Final 0.7.0 BAR SHA-256: `c7d2cf2147f723ea40dbf4e5e24395e35004182b1dece6652455ea4db6421704`; build `1c734926e18281d6e172c396a8ee0eb1`. PPS installer returned `result::success`; the final app reached `stage=running`. Installed JS and PAK SHA-256 values match the production receipt. The BAR contains no private API key or diagnostic guest. The temporary direct-PPS instance was closed after capture to avoid overlapping with a subsequent icon launch. The saved Starship Ascent choice was restored on the final home screen. Physical 0.7.0 acceptance passed: the user confirmed focused terminal input, the two-pane flow and the Menu launcher all work. The next request supersedes this release's visual design and fixed two-pane layout.

## Native 0.8.0: dwindle desktop and local agent tools

The user's correction replaces 0.7's invented window chrome and fixed stacked pair. The desktop uses the original Omarchy icon glyph (U+E900), Liftoff Sunset, a compact top bar and a centered menu that starts closed. Removed the large wordmark, wallpaper label, bottom version strip, + Tile/Apps controls and pane +/maximize/x buttons. A binary split tree supports ten workspaces and sixteen global stable windows, focused leaf splitting, collapse on close, spatial focus/swap, moving between workspaces, fullscreen, split orientation and ratio resizing. Each PTY receives its actual window dimensions. Files and chat reflow with width and height.

Q20 Menu is now a held Super modifier and a tap-to-menu key. The native host queues normalized chords separately from typed characters, including Menu + trackpad navigation; it resets modifiers on deactivation. See NATIVE-SHORTCUTS.md for the implemented bindings and QNX-specific limits. The user subsequently accepted Menu + Enter, Menu + W and single-tap Menu; the October 21 acceptance record below gives the exact sequence.

herdr is now a sidebar over the actual workspace/PTY layout, with real per-chat task status, following upstream screenshot/render structure at `143bf5fd4781d164260c63fe28e7dc08054ad32f`. DeepSeek has sequential function-call execution for local shell, file read/write and desktop operations; a task remains attached to its originating chat even when its tools focus another window. Cancellation stops both HTTPS and command children. Output, context and round counts are bounded. Active agent tasks request background ticks without rendering; idle background windows sleep. This is still an adaptation, not a completed upstream herdr daemon port.

The browser package `com.omacom.OmaBerry.testM14r5OhSB8AynIxgiBld7dw` was backed up locally and uninstalled with the system installer's `action::uninstall` / `package_id` transaction; the result was `success`. The old failed `removeApp` transaction was inspected, not treated as success. The browser backend PID was verified using its `omaberry.log` file descriptors before termination. Native package identity and private data are retained, with displayed name OmaBerry and the old browser's icon bytes.

Verification includes bounded layout invariants, including sixteen repeated focused splits, real native PTY resizing, independent input, Pinyin regressions, agent call sequencing/ownership/cancellation/redaction and actual asynchronous process execution/timeout/output limits. On-device screenshots show the first wallpaper, four separate quarter panes, five recursively divided panes and centered menu. A real DeepSeek task ran pwd in /tmp (QNX resolves it to /dev/shmem), wrote/read a test file and opened Files. It reported a native fsync ENOSYS on shared memory and recovered through shell; the file writer was subsequently fixed to handle absent fsync and rename on QNX shared memory, reporting atomic=false for its direct-write fallback. Ordinary filesystem writes retain atomic rename. Final native-writer retest and package hashes are recorded below after deployment.

Final 0.8.0 file checks passed on-device: private/flash files returned `ok=true, atomic=true`; /tmp returned `ok=true, atomic=false` and exact content. A fresh DeepSeek task used only write_file and read_file successfully, returning a Chinese confirmation without shell fallback. Production BAR SHA-256: `6be97284b0f685261ab2ef35058073f2fad1baccd7bbe3a23402e2390e6f95f5`; build `250ea17aca57893a758240674bbaaa20`. The original browser icon bytes, private-key exclusion and diagnostic-code exclusion are verified in the BAR.

Final PPS install returned `result::success`; installed JS and PAK match the final receipt. Production app reached `stage=running` with build `250ea17aca57893a758240674bbaaa20`. Diagnostic code/data and test files were removed, Liftoff Sunset restored, and the direct test instance closed before icon-launch acceptance. The native desktop screenshots are docs/native-080-home.png and docs/native-080-four.png.

## Native 0.8.1: OmaBerry branding and native-only documentation

The project owner's supplied transparent green OmaBerry mark replaces the Omarchy glyph in the top-left menu trigger and centered menu, and replaces the old browser icon in the BB10 launcher. The original artwork is preserved in docs/logo.png; resized variants and their uses are documented in BRANDING.md. The menu heading now reads OmaBerry. Liftoff Sunset and the existing recursive layout are retained.

The project README and native development guide now describe the PocketJS/QuickJS/native-host architecture, build and deployment path, direct BerryCore operations, private DeepSeek configuration, current agent tools and remaining herdr limitations. Browser sources are explicitly historical and are not required by the native runtime. Repository description and topics now identify PocketJS native development.

Production BAR SHA-256: `6d501b216a6492191ee902b15a984fee17b575f25e8a6e55c616288b59b855c4`; build `3d3e243a48840c71acda8aed45410fcd`. Resource checks compare all sixteen wallpaper tile payloads and the new 256px logo with their source pixels, verify linear sampling and Chinese glyph coverage, and confirm the old glyph/wordmark are absent from the pack. The BAR contains the supplied launcher icon and no private credential or diagnostic guest.

PPS installation returned success. Installed production JS/PAK hashes match the receipt; installed launcher icon bytes match native/host/icon.png. The app reached stage=running at 720×720. docs/native-home.png is a production framebuffer. docs/native-four.png and docs/native-menu.png are real framebuffer captures after a temporary scripted guest opened four PTYs and the menu; commands returned /tmp, QNX and a 12×20 terminal size. The production guest was restored and its hashes rechecked afterward. Diagnostic files and the direct-launch test instance were removed/closed. This verifies the branding and native presentation; it does not substitute for physical acceptance of the held Menu shortcuts.

## October 21: physical Menu and tiling acceptance

The user answered “三项都正常” to the pending 0.8.0 acceptance prompt: launch from the phone's OmaBerry icon, hold Menu and press Enter twice, press Menu + W, then tap Menu alone. The user confirmed two tiled terminals appear, closing one expands the remaining pane, and the centered menu opens. This establishes physical acceptance of Menu as the held modifier for Enter/W, close-and-collapse behavior, and the single-tap menu action.

The reply arrived after 0.8.1 had been installed; it did not independently identify the tested build. Record this as acceptance of the requested interaction sequence, without assigning it to a newly observed build hash or generalizing it to every shortcut. No code or package change was required for this confirmation.


## Native 0.9.0: herdr sessions and agent-editable native UI

The reference is upstream herdr at `143bf5fd4781d164260c63fe28e7dc08054ad32f`, especially its spaces/agent sidebar and session tabs, plus the user's phone mockups. The native adaptation removes the separate herdr titlebar, adds session tabs with independent split trees and PTYs, real agent status, a compact project/tab status line and a + sessions menu. There are ten workspaces, up to eight tabs per workspace and sixteen shared windows. Workspace/tab layouts and names persist; each chat saves bounded recent excerpts. PTY processes and Notes are still process-lifetime state.

The `native_ui` tool exposes the real private `data/workspace/ui.js` source, supported PocketJS component API, apply/status and rollback/reset. A fresh QuickJS runtime evaluates each module with a 60 ms deadline, 8 MiB memory limit, 128 KiB stack and no host APIs. Validated View/Text/Button trees render as native PocketJS components. Files are watched for changes, button state persists, accepted source has a single undo slot, and invalid changes retain the last good view. Theme output changes the actual herdr frame/tabs/focus colors. This does not compile main-desktop TSX, native C or baked resources on the phone.

On-device DeepSeek verification used real function calls: `native_ui source` → `write_file` → `native_ui apply`. The model changed the preview title to “原生 UI 已更新” and the accent to green, retained both buttons, and received matching `revision`/`displayedRevision` (`f0dd2323-593`) with `presentation: presented` at native frame 846. A subsequent task restored Tokyo Night blue (`be6415e0-593`). The model remained attached to its original chat while its tool focused the preview. This proves source editing and native presentation; the provider receives the validated tree and frame acknowledgement, not screenshot vision.

Real QNX diagnostics verified counter state, invalid syntax retaining the accepted UI, interruption of `while(true){}`, rollback, recovery and restart restoration of tabs/UI source/state/chat excerpts. Controller tests cover independent tabs, persistence validation, agent ownership and delayed presentation acknowledgement. Portable C tests execute the real pinned QuickJS evaluator and native PTYs, including initial cwd. Framebuffer captures are actual 720×720 PocketJS output, not browser screenshots.

Production build: `66de01d27d528473150f5fde9ab20bb7`; BAR SHA-256: `3f05d4cfac4f8dc057a123c0aa1b7a3541934710aee4e8e28f981dfb61d372f0`. The first PPS request stalled while the phone was unavailable; after the user restarted it, the installer reported `failure 881 no debug token found`. Consequently this development device uses an in-place update of the existing OmaBerry package's native executable/JS/PAK through its already configured development bridge. This is not a successful BAR installer transaction: the package registry retains its earlier version metadata. The previous payload is backed up outside the application; private app data is retained. Standard installations still need a device accepting the development BAR.


Final executable, guest JavaScript and PAK were read back from the device and matched the production receipt. Production framebuffer `docs/native-ui.png` shows the restored blue theme, Chinese agent-edited title and persisted Count: 1. `docs/native-herdr.png` shows real chat/shell panes with the final host during scripted verification. The fresh-tab shell began in the private UI workspace; switching back retained an existing shell's `/tmp` cwd, and closing a tab's final pane removed that tab. The BAR excludes the private credential and diagnostic hooks. Diagnostic command/state files were removed; the direct test instance was closed before physical icon-launch acceptance. The system package registry version caveat above remains.

### October 21: physical live UI and session-tab acceptance

After the 0.9.0 native payload update, the user answered “计数保留、新 shell 标签都正常” to the icon-launch acceptance prompt. Tapping Count: 1 changed it to Count: 2; switching to the agent tab and returning to preview retained Count: 2. Holding the physical Menu key and pressing T opened a new shell tab. This confirms native button interaction, state retention across tab switches and the physical Menu + T shortcut. It does not add a physical restart-persistence test or acceptance of every new shortcut; the earlier scripted restart checks remain separate evidence. No code or package change was needed for this confirmation.


## Native 0.10.0: independent herdr app and embedded web pages

herdr is now a regular application window with independent project/agent state. The system desktops own recursive tiling; new shells create desktop windows. Chinese candidate buttons use the CJK font slot. Trackpad input accumulates small movements and separates desktop focus, scrolling, Pinyin selection and webpage pointer use. A native system-WebKit compositor embeds actual web pages inside desktop tiles, with bounded browser tools available to the agent.

See [0.10.0 verification](NATIVE-0100.md) for real-device browser/form tests, four-shell recursive geometry, agent source/apply/present/rollback evidence and deployment details.

### October 21: physical 0.10.0 acceptance

The user confirmed “三项都正常” after icon launch: herdr's CN candidates display correctly and can be selected/committed with the trackpad; two Menu + T launches create desktop-level tiled shells; Menu + 2 opens the browser workspace, where the physical keyboard enters `abc` into the webpage. The earlier standalone webpage-input prompt also received “能显示 abc”. These confirmations supplement the scripted checks; they do not imply arbitrary website or full shortcut compatibility. No new build or device mutation was needed to record acceptance.
