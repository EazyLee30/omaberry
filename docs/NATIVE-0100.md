# Native 0.10.0 verification

Date: 2026-10-21. Target: BlackBerry Classic / Q20, BB10 / QNX.

## Application and desktop ownership

herdr owns project selection and independent agent sessions. Numbered system desktops own one recursive split tree each. The herdr sidebar exists only inside its application window; its new-shell action opens a separate desktop terminal. Restoring 0.9 layouts merges former tab trees into desktop windows and retains the original chat files.

On the phone, three shell shortcuts on Desktop 2 produced a half-width pane and two quarter panes. A fourth shell split the last quarter again. Selecting the scratch project kept Desktop 2 active; its new shell started in `/tmp` (QNX resolves this symlink to `/dev/shmem`). Other shell sessions kept their own directories. Closing the browser expanded the remaining herdr tile to the full desktop area.

## Chinese input and trackpad

The old candidate buttons selected the Latin-only monospace font slot. Candidate text now uses font slot 0 with bundled Noto Sans SC glyphs. A real framebuffer shows `1 你  2 尼  3 呢`; scripted `nihao` plus Space commits `你好`. The C motion test covers accumulation, dominant axis, direction reversal and throttling. Physical selection and movement feel still need separate user acceptance for this build.

## Embedded browser

The system WebKit WebPage compositor renders into the native desktop framebuffer. No separate browser app/card or web desktop is launched. Real-device checks:

- Local HTML/JavaScript counter increments from 0 to 1 with native pointer injection.
- A focused form receives `abc你好` and fires its own input event; Backspace changes it to `abc你`.
- The counter and form remain when switching away to another desktop and returning.
- Resizing between a half tile and a full tile produces 326px and 680px content widths.
- Alt-scroll changes the displayed page region; the native centered menu hides the web texture while open.
- HTTPS `example.com` reaches title `Example Domain`; Back and Forward restore the local page and the HTTPS page respectively.
- Closing a Browser tile releases its page and collapses the desktop split.

The system engine is old. Modern JS/CSS/TLS, cross-origin iframe editing, custom keyboard-driven editors, downloads, popups and native form dialogs are not promised. Basic text fields use an isolated DOM editor commit bridge; pages cannot access OmaBerry's native command bindings. Four pages may be open simultaneously. URLs persist; DOM state does not survive a full app restart.

## Actual agent / native UI loop

A fresh DeepSeek session executed `pwd` in the selected private workspace, read the existing `ui.js`, added `0.10 verified`, wrote the file and applied it. The native presenter acknowledged revision `d416b639-643`. The agent then rolled back to `be6415e0-593`, received the same displayed revision and observed `Count: 2`. It read Browser state and reported the real page title `Count: 1`. The original user chat and UI state were preserved.

This proves tool execution and native frame acknowledgement. The model receives a validated native tree and revision, not screenshot vision.

## Checks

Passed: native tiling/migration, herdr project/session limits and persistence, browser URL/focus/bounds, agent sequencing/ownership/cancellation/redaction, live UI apply/presentation/rollback, PTY input/resize, files, Pinyin, native text forwarding, glyph pack and wallpaper/logo pack. The C trackpad test and pinned QNX build pass. The generated BAR excludes the private credential and temporary diagnostic guest.

The screenshots in the README are actual 720×720 device framebuffer captures. UI actions in diagnostic captures were scripted; that evidence is distinct from a user's physical keyboard/trackpad acceptance.

## Production artifact

- Build: `e2f7fd91a86340ae02dd4e169088774f`
- BAR SHA-256: `2d094b5be47a47688def544f6cb154fe825179a9a7fe9981f759b29385268b05`
- Host SHA-256: `376a508b115b4a0ac323e2a0975e29d7a14672889e57d46d838a98ee8d9b2174`
- Guest SHA-256: `d3169f7c2a0a9fbac2d794b313cd01cd327f9b9d3ec93cb06dc6446643262089`
- Pack SHA-256: `abeb26c3c7e829c2c15b16a669e7a824dbcea9eeae37fcbddc798078d568364d`

The final executable, guest JS and resource pack were read back from the phone and match the hashes above. The app reached `stage=running` with this build ID. This development phone still has no accepted debug token: deployment updates the existing package's native payload using its configured development bridge. It is **not** a successful BAR installer transaction; system package registration retains its older version metadata. The pre-0.10 payload is backed up outside the app and private app data is retained. Diagnostic guest code and command/state files are removed from the production installation.

Production restart checks restored herdr project/session selection on Desktop 1 and the Browser URL on Desktop 2. The restored web page rendered at 680×518 with its counter reset to 0, as expected after process exit. The test process was then closed for physical icon-launch acceptance. A local HTML fixture remains in the private app data for that keyboard check; it is not part of the shipped BAR.
