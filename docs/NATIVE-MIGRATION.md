# OmaBerry Native — P0 audit

Status of the migration from the Berry Browser shell to a PocketJS native QNX
host. This records what was **actually built and installed**, and separates it
from what is still an intention. Anything not marked verified has not been
run.

## P0 verdict: the toolchain works

The blocking question was whether a native QNX build needs the proprietary
QNX SDP — the same wall berrybrowser-cjk hit when rebuilding Chromium. It
does not. PocketJS pins a Docker image and drives it from `bun`.

Verified on this machine (Apple Silicon macOS):

| Prerequisite | Result |
| --- | --- |
| Docker daemon | 29.2.1, aarch64 |
| `accupara/bbndk` pinned image | pulled, `blackberry-nativepackager 1.11` inside |
| Rust `nightly-2026-07-02` + `rust-src` | installed |
| `pocket-nexus/quickjs-rs` pinned revision | `ba5bdd0` |
| `armv7-qnx-eabi.json` target | present |
| QNX compiler | `4.8.3,gcc_ntoarmv7le` (inside the container) |

`bun install` is a separate step from `bun blackberry-qnx setup`: the latter
only prepares the toolchain, and the guest bundle build fails without the npm
dependencies (`@vue/compiler-dom` missing via `@vue/compiler-vapor`).

## P0 verdict: it builds and it installs

```
$ bun blackberry-qnx build
PocketJS BlackBerry QNX: Hero BAR -> dist/blackberry-qnx/pocketjs-blackberry-classic-hero.bar
SHA-256: d1487f01f0b0182be9c2bb94f34fd3b394c51a47da09481ca6e9afd0ab8497df
```

| | |
| --- | --- |
| BAR | 819 KB, six entries |
| `native/pocketjs-classic` | 1.2 MB, ELF header confirmed |
| `native/app.js` | 203 KB guest bundle |
| `native/app.pak` | 4.0 MB — packed assets and the compiled style table |
| install on the rooted Q20 | `result::success` |
| installed path | `/apps/dev.pocket_nexus.blackberry_classic_demo.testDev_lassic_demo45ec1699` |

The size comparison is the point of the exercise: 819 KB against the 65 MB
Berry Browser repack. There is no Chromium in the package.

**Not verified:** the app has not been launched on the device and seen to
render. It is installed and present on the filesystem; whether it draws
anything has not been observed here.

## The input gap is narrower than it looked

The plan assumed Chinese input would need a new contract. It does not — the
contract exists and is already implemented. What is missing is the channel
between the two.

| Layer | Text / IME |
| --- | --- |
| `contracts/spec/ime.ts` | `ImeCandidatePage`, candidate slots, selection key range |
| `contracts/spec/text.ts` | `TextFace`, `TextGlyphRequest` |
| `engine/quickjs-c/pocket_runtime.c` | implemented (88 `ime` and 186 `text` references) |
| `hosts/blackberry-classic-qnx/main.c` | **absent** |

The public C API in `engine/quickjs-c/pocket_runtime.h` offers only
`PocketRuntimeInput` — a button mask and a touch snapshot:

```
pocket_runtime_boot(...)
pocket_runtime_tick(PocketRuntimeInput *input)
pocket_runtime_tick_contacts(...)
pocket_runtime_frame(...)
pocket_runtime_gl_initialize / render / shutdown
```

So Phase 1 is **not** a new contract. It is extending the host ABI to carry
characters and IME events from QNX BPS keyboard events into a runtime that
already knows how to consume them. The docs register the target as
`blackberry-qnx-dev`, **host ABI 9**, so this means bumping the ABI version
rather than inventing one.

What the QNX host feeds today, per `docs/BLACKBERRY_CLASSIC.md`:

| Physical input | Portable input |
| --- | --- |
| trackpad movement | d-pad pulse per threshold crossing of accumulated motion |
| trackpad click | the press button (`CIRCLE`) |
| Enter / d-pad centre | the press button |
| arrow keys | d-pad |
| Space | `START` |
| Menu | `TRIANGLE` |
| Send | one-shot press edge |
| Back, End | stay with the system |

There is no character input anywhere in that table. The target also stays
outside `POCKET_TARGETS` until installation, boot, presentation, touch,
keyboard, trackpad, background/resume and repeatable delivery are all
recorded — so it is not yet a validated target in upstream terms either.

## Phase 1: text input is now in the ABI

Written and built, not yet observed on a device. The patch is
[`docs/upstream/pocketjs-text-input.patch`](upstream/pocketjs-text-input.patch)
(222 lines, 149 insertions across four files).

**`pocket_runtime_push_text(const uint8_t *, size_t)`** queues UTF-8 bytes; the
queue drains into the **fifth argument** of the guest's `frame()` call.

That shape is the whole compatibility argument. A struct change to
`PocketRuntimeInput` would have been an ABI break for all eleven hosts, where
adding a trailing argument keeps every existing consumer correct.

**The slot it goes in matters more than the shape.** The first draft passed
text as the fifth argument. Reading `framework/src/host.ts` showed the guest's
`frame()` already declares eight parameters —

```
frame(buttons, analog, touches, hits, touchSurfaces, rightAnalog, axisDeltas, motion)
```

— while the C layer only ever passed the first four. So the fifth slot is
`touchSurfaces`, and a text array landing there would have been read back as
touch surface data and silently corrupted touch input. Text is now appended
**after the last declared parameter**, as the ninth argument, with the four
in-between slots passed as `JS_UNDEFINED`.

The queue is bounded and lossy on overflow (64 slots × 24 bytes, split long
input rather than truncating it). A keyboard cannot outrun a frame.

### What QNX actually gives you for text

The first attempt used `SCREEN_PROPERTY_UNICODE`. **It does not exist in
BBNDK 10.3.1** — the build failed on an undeclared identifier. Pulling the
header out of the pinned image and reading it is what settled it. The real
surface is `KEY_SYM`, `KEY_ALTERNATE_SYM`, `KEY_CAP`, `KEY_SCAN`, `KEY_FLAGS`,
`KEY_MODIFIERS`, `MODIFIERS`.

screen.h, on `SCREEN_PROPERTY_KEY_ALTERNATE_SYM`, describes the Q20 exactly:

> On reduced keyboards with a limited number of keys, the alternate key symbol
> may correspond to a non-printable shortcut or command symbol while the main
> key symbol would be suitable for text entry.

So the **main `KEY_SYM` is the character**, and `KEY_ALTERNATE_SYM` is the
Alt-chord variant — which matches what the Q20 does today, where Alt+F arrives
as `6`. The host now encodes `KEY_SYM` to UTF-8 and pushes it on key-down and
key-repeat.

### Verified

- builds: `bun blackberry-qnx build` → `pocketjs-blackberry-classic-hero.bar`
- `pocket_runtime_push_text` is present in the linked ELF
- BAR grew about 0.5 KB
- installs on the rooted Q20: `result::success`

### Not verified

That typing a character reaches the app. This needs the app on the device to
read the new `frame()` argument and do something with it; the Hero demo does
not, so the pipeline is there and unexercised.

## What Phase 1 still requires

1. Feed QNX `SCREEN_EVENT_KEYBOARD` into a text path instead of only into the
   button mask. Character semantics and key semantics have to stay distinct
   (the mask maps Space to `START`, which is not what a terminal wants).
2. Extend `contracts/spec/spec.ts` and regenerate `pocket_spec.h` /
   the Rust side, keeping the byte-compare in `tests/contract.ts` honest.
3. Bump the host ABI and keep `blackberry-classic-profile.ts` in step.
4. Route the existing IME contract to a candidate window, so pinyin composition
   can land where the runtime already expects it.

## Boundaries this keeps

- The phone stays BB10/QNX. No Hyprland, no Wayland, no Arch kernel.
- BerryCore keeps providing shell, files, SSH and agent backends.
- Replacing the browser does not replace the BB10 home screen or a system
  window manager.
- The web desktop is kept until the native path covers it; it is not deleted
  to make the migration look further along than it is.

## Not started

Phases 2–6 of the migration plan: native desktop and launcher, native IPC,
native terminal with CJK, the agent runtime, and the OmaBerry BAR build path.
None of that is claimed here.