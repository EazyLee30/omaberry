# Native 0.11.0: real screen observations

Target: BlackBerry Classic / Q20, BB10/QNX. Verified on 2026-10-21.

## What changed

herdr remains an application inside the desktop. Its upper-left area browses the selected project directory, the lower-left area lists agents and their states/count, and the right side contains session tabs and conversation. New agent sessions automatically become selected in the agent list. Files open in native Files with the correct directory breadcrumb, CJK glyphs and width-aware text wrapping; new shells remain recursive desktop tiles. There is no additional herdr titlebar. The current built-in engine is DeepSeek, not a renamed upstream DSH.

The agent now receives actual PNG pixels from the foreground OmaBerry framebuffer, including embedded WebKit pages. Native capture occurs after web texture composition and is published only after a successful frame swap. Each observation has its own ID, physical dimensions, frame number, capture time and private PNG path. Only the two latest private PNG captures are retained; older captures are pruned after restart. PNG bytes are not stored in chat excerpts.

`screen` supports observe, click, type, key and scroll. Coordinates are physical screen pixels (normally 720×720, origin top left). Desktop rectangle metadata uses logical units (360×360), while the older browser tool uses pixels relative to the webpage viewport. Screen actions require the latest observation ID, reject changed layouts/out-of-bounds coordinates/background execution, and automatically take another screenshot. Visual actions queue events; their returned image and page/input state establish what actually happened. Animated pages can still move between capture and action.

The DeepSeek transport accepts bounded image requests (6 MiB), with at most two images retained in volatile request context and 24 tool rounds per task. Images are added as user content after all matching tool results, as required by the [DeepSeek vision interface](https://api-docs.deepseek.com/guides/vision/). Images, tool results and web content remain untrusted task data.

## Real device / real model checks

These were executed by the built-in agent using the configured DeepSeek service on the phone:

- It switched to Desktop 2 and described screenshot details of Google, YouTube and Time.is. The input included real pixels, not only titles/metadata.
- It read the original native `ui.js`, changed only the title to `Vision OK 7319`, wrote/applied it, inspected the rendered preview and maximized it. It found and clicked the Count button from the screenshot; native state and the next image showed 2 → 3. It rolled back the source to revision `be6415e0-593`. Test cleanup restored Count to 2.
- It created a test browser on Desktop 3, located a real input by its screenshot, clicked and typed `Berry vision 7319`. WebKit reported `inputAccepted: 1` and the fixture's own input handler set its title to `Input: Berry vision 7319`. The next visual click triggered the page counter and title `Count: 1`. The agent closed that test window; the existing three browser windows on Desktop 2 were preserved.

Independent on-phone Python control also obtained and decoded a **359,967-byte PNG**, verified its 720×720 header, clicked the top-left logo, observed the centered menu, sent the Menu key and observed the menu close. Observation IDs advanced 2 → 3 → 4. No Mac process executed these actions; the Mac deployed the build and read the test evidence.

The final herdr layout was also sent to the real model: it identified `data/workspace`, the three visible agent rows and the right-hand conversation/input controls directly from a 720×720 observation.

These checks establish the tested native/web controls, not arbitrary website compatibility, other phone applications or complete upstream harness parity. Physical Chinese input and Menu shortcuts retain the separately recorded 0.10 user acceptance.

## Local control interface

PocketJS writes `omaberry-control.py` into the private UI workspace. A local process running with the app's access can call it:

```sh
python3 omaberry-control.py screen '{"action":"observe"}' --image
python3 omaberry-control.py desktop '{"action":"open","app":"terminal"}'
python3 omaberry-control.py native_ui '{"action":"source"}'
python3 omaberry-control.py native_ui '{"action":"apply"}' --image
```

For a coordinate action, use the ID from the immediately preceding observation:

```sh
python3 omaberry-control.py screen '{"action":"click","observation":4,"x":34,"y":24}' --image
```

Methods: `screen`, `desktop`, `browser`, `native_ui`, `herdr`; arguments follow the built-in agent tool schemas in `native/src/agent.ts`. `--image` adds a base64 PNG object to stdout for an actual multimodal client. Without it, the JSON includes the private file path and observation metadata. A local harness must explicitly consume this image; a path alone is not visual inspection.

IPC files are in `data/control`, outside the editable UI directory. The client serializes requests using a directory lock, uses unique request IDs, atomically writes requests and waits for matching replies. The native handler rejects expired requests and concurrent built-in agent jobs. No network listener, root operation or browser JavaScript bridge is involved. Keep OmaBerry foreground. A killed Python client can leave `control.lock`; remove that empty lock only after confirming the owning client has stopped.

## Scope and checks

The live UI editor supports validated native View/Text/Button trees, state and theme. It does not recompile arbitrary main TSX, native C/C++ or resource packs on the phone. Full DSH, OpenCode and Pi ports remain separate work; see [the runtime audit](NATIVE-AGENT-RUNTIMES.md).

Passed: native screen freshness/foreground/bounds/expiry, image/tool ordering and bounded context, control IPC ownership/replay/timeouts, herdr directory/session behavior, tiling, browser, live UI, terminal, files, Pinyin, text, font and wallpaper tests, plus the pinned QNX native build. Temporary diagnostic hooks are excluded from the production BAR. The configured development phone is updated in place; its older package-registry version is unchanged, as in 0.10.

## Production artifact

- Build: `9c584f4d18dec4be1136173918d6d4d8`
- BAR SHA-256: `8548091cda1acf4a298403e9578d7e60616d85cc1d596ec18ae7ff10af07ab41`

The final installed host, JavaScript and resource pack were read back from the phone and matched the receipt hashes. The matching build reached `stage=running`; a clean-production control request returned a real 720×720 PNG. Temporary diagnostic commands were removed from the deployed payload.

A final production click on herdr’s `ui.js` entry opened Files as a separate half-width desktop tile. The preview rendered `原生 UI 已更新` with actual Chinese glyphs; closing the test tile restored herdr and preserved the three existing browser windows.
