# OmaBerry native development

OmaBerry **0.9.0** is a native PocketJS desktop for BlackBerry Classic / Q20 on BB10/QNX. The active interface includes recursive tiling, BerryCore PTYs, Files, Notes, Chinese Chat, local agent tools and herdr-style spaces/session tabs and live native UI editing. See the [project README](../README.md) for current features and limits; historical prototypes and device acceptance results are in [NATIVE-MIGRATION.md](../docs/NATIVE-MIGRATION.md).

The application runs without a browser, WebView or Node server. TypeScript and Solid JSX compile to PocketJS's guest JavaScript and resource pack; the native QNX host renders the interface and supplies input, PTY, file, process and HTTPS bindings.

## Source layout

| Path | Purpose |
| --- | --- |
| `native/src/app.tsx` | Top bar, centered menu, applications, shortcuts and desktop tools |
| `native/src/tiling.ts` | Ten workspaces, sixteen stable window slots and binary split trees |
| `native/src/live-ui.ts`, `live-view.tsx` | Editable native UI modules, validation, presentation and rollback |
| `native/host/ui_eval.h`, `ui_qjs.h` | Isolated QuickJS evaluator and native presented-frame counter |
| `native/src/agent.ts` | DeepSeek function-call loop, per-chat ownership and cancellation |
| `native/src/terminal.ts`, `files.ts` | Terminal rendering and file-browser controllers |
| `native/src/chinese-text.ts` | Offline Pinyin composition |
| `native/host/` | Native C implementations and QuickJS bindings; BB10 launcher icon |
| `native/pocketjs-omaberry.patch` | Pinned PocketJS input, rendering, host and build integration |
| `scripts/native.py` | Prepare, build, launch and inspect a native development checkout |
| `native/src/images.json`, `fonts.json` | Texture sampling and glyph configuration |

`native/src` and `native/host` are canonical. Build preparation copies their files into the ignored `.cache/pocketjs` checkout. Changes to tracked PocketJS runtime files must be captured in `native/pocketjs-omaberry.patch`; changing only a cache checkout is not a reproducible source change.

## Build

Prerequisites on the build computer:

- Git, Python 3 and Bun.
- Rustup with PocketJS's pinned `nightly-2026-07-02` toolchain and `rust-src`.
- A running Docker daemon capable of `linux/amd64` containers.

Prepare the pinned PocketJS source:

```sh
python3 scripts/native.py prepare
rustup toolchain install nightly-2026-07-02 --component rust-src
cd .cache/pocketjs
bun blackberry-qnx setup
bun blackberry-qnx doctor
cd ../..
python3 scripts/native.py build
```

`prepare` clones PocketJS at `3d0983769f62ac75bacd62b723c15202425b2dd1`, applies the project patch, copies native sources and installs locked Bun dependencies. It refuses an incompatible checkout instead of overwriting it.

PocketJS's setup fetches its pinned QuickJS source and BBNDK container. The container is `accupara/bbndk` at digest `sha256:91268df2ead23a6fa9c17b600ffc6e04bf6b38eaa97f6a48c2f59ffc221ae6d2`, targeting QNX ARMv7 with API level `10.3.1.995`. The build produces the runtime, guest and BAR, then copies the BAR and receipt into `out/native/`.

For a guest-only development check after preparation:

```sh
cd .cache/pocketjs
bun blackberry-qnx build-demo
```

This does not replace the installed app or produce a complete new release. Use the full build for deployment.

## Device installation

The phone needs BerryCore at `/accounts/1000/shared/misc/berrycore`, with working shell tools and `curl`. Install `out/native/pocketjs-blackberry-classic-hero.bar` using the BB10 deployment method configured for that device. The developer BAR requires a device accepting development packages; it is not a store-signed package. PocketJS also provides `bun blackberry-qnx install` for a configured `blackberry-deploy` connection.

The displayed name is **OmaBerry**. The package retains its existing development identity:

```text
dev.pocket_nexus.blackberry_classic_demo.testDev_lassic_demo45ec1699
```

It updates the PocketJS Classic development app in place, preserving private configuration. Allow **Shared Files** when prompted so the native app can access BerryCore. Internet access is used for DeepSeek. Terminal and Files do not require a network service.

On the existing SSH development setup:

```sh
python3 scripts/native.py launch --host blackberry
python3 scripts/native.py status --host blackberry
```

`launch` uses the device's existing `/bin/__root` launcher bridge, stops only exact matching OmaBerry processes and requests a native launch. It is specific to the configured development device, not a general-purpose installation or root setup tool. Restarting restores saved workspace/tab layouts and recent chat excerpts, but starts new PTYs; it does not resume running shell processes. Normal use is through the phone's OmaBerry icon.

## DeepSeek configuration

Provision `data/deepseek.json` separately inside the app's private directory, with mode `600` and ownership allowing the application to read it:

```json
{
  "apiKey": "YOUR_DEEPSEEK_API_KEY",
  "model": "deepseek-flash"
}
```

Do not put credentials in `native/src`, the resource pack, a BAR or Git. The native transport reads the private file, sends HTTPS requests through BerryCore curl with CA verification, and keeps the bearer header out of process arguments. The UI only receives configuration availability and model name.

Chat supplies the model with its conversation and the results of tools it invokes. The agent tools are `run_shell`, `read_file`, `write_file`, `desktop` and `native_ui`. Shell execution uses the app user's permissions and BerryCore environment, a bounded output buffer and a 1–60 second deadline. Stop cancels both transport and command children. File writes are limited to 64 KiB and use atomic replacement where supported; QNX shared-memory paths such as `/tmp` report `atomic=false` for their direct-write fallback.

## Input and rendering

- Hold the physical Menu key as Super; tap it for the menu. Native shortcut events are separate from typed text.
- Each focused pane owns its text input. PTYs retain their processes across workspace changes and receive resized row/column dimensions.
- Chat's CN mode provides an offline Pinyin composer. Space or Enter commits a candidate; ABC returns to Latin input. This is not BB10 system IME integration.
- The screen is 720 × 720 physical pixels, with a 360 × 360 logical viewport.
- Native textures must fit the renderer's limits. Each wallpaper uses four 512 × 512 tiles; the OmaBerry logo uses a 256 × 256 transparent texture with linear sampling.
- Font slot 0 contains common simplified Chinese glyphs from Noto Sans SC. Other slots stay small; full Unicode/emoji coverage is not claimed.

The [shortcut map](../docs/NATIVE-SHORTCUTS.md) lists implemented bindings. The [brand asset guide](../docs/BRANDING.md) identifies the logo source and variants.

## Live native UI

The device creates private `data/workspace/ui.js`. It is a JavaScript function body returning a native component tree, evaluated in an isolated QuickJS runtime and rendered by PocketJS. Editing this file does not require a browser, a desktop compiler or a BAR reinstall. See [the source API, agent workflow and recovery guide](../docs/NATIVE-LIVE-UI.md). Main TSX and host changes still use the normal build path.

## Verification

After building the guest, validate packaged resources and the native controllers:

```sh
bun test/test-native-wallpapers.ts
bun test/test-native-fonts.ts
bun test/test-native-tiling.ts
bun test/test-native-agent.ts
bun test/test-native-live-ui.ts
bun test/test-native-terminal.ts
bun test/test-native-files.ts
bun test/test-native-pinyin.ts
bun test/test-native-text.ts
```

Portable C checks exercise real PTYs, processes and file writes on the development host:

```sh
clang -Wall -Wextra -Werror test/native-terminal.c -o .cache/native-terminal-test
.cache/native-terminal-test
clang -Wall -Wextra -Werror test/native-exec.c -o .cache/native-exec-test
.cache/native-exec-test
clang -Wall -Wextra -Werror test/native-file-write.c -o .cache/native-file-write-test
.cache/native-file-write-test
```

A successful build does not establish device input behavior. Compare the installed JS/PAK hashes with `build-receipt.json`, check the matching `build_id` and `stage=running`, and inspect a real framebuffer. The host writes its own startup frame to `data/omaberry-first-frame.ppm`; SIGUSR1 refreshes it while the app is foreground. It captures only this application. Temporary scripted diagnostics must be removed from production guests.

Physical Notes editing, persistent shell cwd across navigation, Files filtering/reading, Chinese composition/chat and wallpaper persistence have been accepted on the Q20. On October 21, the user also confirmed the held Menu + Enter sequence opens two tiled terminals, Menu + W closes one and lets the remaining pane fill the space, and a single Menu tap opens the centered menu. This acceptance covers those specific controls; other shortcut combinations retain their separate verification status. Current evidence and its limitations are recorded in the [verification history](../docs/NATIVE-MIGRATION.md).

`test/native-ui.c` exercises the isolated evaluator against the pinned QuickJS source (compile with its `quickjs.c`, `cutils.c`, `dtoa.c`, `libregexp.c`, `libunicode.c` and `-lm`). It checks syntax errors, infinite-loop interruption, memory/output bounds, isolated globals and recovery after failed evaluations.
