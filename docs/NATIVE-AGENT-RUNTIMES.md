# Local harness compatibility audit

Date: 2026-10-21. User requirement: all execution on the Q20, with PocketJS native presentation. No Mac/SSH execution fallback.

## Observed device runtime

An actual child process of OmaBerry reports Node `v22.0.0`, platform `qnx`, architecture `arm`. BerryCore launches it with `--jitless`. Both `typeof Intl` and `typeof WebAssembly` are `undefined`. Running BerryCore executables from the unrelated SSH service can return `Operation not permitted`; the tests below ran as children of the native OmaBerry application.

The existing BerryCore `opencode` command is an SSH launcher to a Mac. It was inspected, not treated as an on-phone installation, and was not used for this work.

## Upstream versions inspected

| Harness | Exact upstream | Actual result / missing work |
| --- | --- | --- |
| DSH | `@deepseek-ai/dsh` 0.2.1-rc.2 | The original entry uses `import.meta.main`, absent in Node 22.0. Explicitly invoking its exported `runCli()` prints the real version. A diagnostic adapter passed the missing native addon/loader checks and printed official ACP help in 41.8 s. Real ACP startup then failed with 31 inactive plugins: Unicode properties, Intl, Zstd exports and newer process utilities are missing; it also hit `EMFILE`. No successful ACP initialization or agent session. |
| Pi | `@earendil-works/pi-coding-agent` 1.3.0 | Declares Node ≥22.19.0. Original CLI fails because `node:module` has no `enableCompileCache`. Launching the published runtime directly then fails parsing `\p{ID_Start}` / `\p{ID_Continue}` Unicode properties. Intl and WASM capabilities also need an implementation before claiming full parity. |
| OpenCode | `opencode-ai` 1.19.3 | Published manifest contains Darwin/Linux/Windows and x64/arm64 targets; no QNX/ARM32 artifact. A Bash/Node wrapper cannot execute its Bun binary on this platform. A runtime/native dependency port is required. |

Sources: [DSH official repository](https://github.com/deepseek-ai/deepseek-harness), [DSH published package](https://registry.npmjs.org/@deepseek-ai/dsh/0.2.1-rc.2), [Pi published package](https://registry.npmjs.org/@earendil-works/pi-coding-agent/1.3.0), [OpenCode published package](https://registry.npmjs.org/opencode-ai/1.19.3).

Published DSH/Pi JavaScript and dependency files were staged in private device data for compatibility probes. Foreign-OS binary packages and build-time source maps/type declarations are excluded from that test tree. No npm lifecycle scripts were run. This tree is not included in the OmaBerry BAR and is not advertised as a working full harness. Private API credentials were not copied into packages or logs.

The DSH diagnostic adapter runs only in that separate process. It uses Node's `--expose-internals` to implement the unrestricted `node-addon-require-builtin` API, aliases the older loader's `getModuleJob` for the upstream compatibility check, and calls the official exported `runCli()`. This is a startup experiment, not a replacement implementation of DSH. The real ACP test sent `initialize` over stdin and received no protocol response before startup failed after roughly 87 s. In addition to Unicode/Intl errors, the reported missing exports are `node:zlib.createZstdCompress` and `node:util.getSystemErrorMessage`. Session persistence, subprocess tools, credentials and the required ACP plugin did not activate. The temporary probe processes were stopped; the staged dependency tree is retained for further on-phone porting.

## Native infrastructure available now

OmaBerry's built-in DeepSeek agent executes local commands and can inspect/operate actual screen pixels. A separate on-phone process can use the [private control client](NATIVE-0110.md#local-control-interface) for screenshots, native UI apply, desktop and browser actions. That provides a real integration boundary for future harness ports; it does not substitute for their runtimes, tool registries, session protocols or user interfaces.

Next requirements are a compatible Node/runtime foundation (including needed Unicode/Intl/WASM behavior), QNX native dependency adapters, and real session protocol integration into herdr. A version/help response alone will not count as full functionality: model inference, local tools, permissions, cancellation, session recovery, extensions and native screenshot consumption must be tested on the phone.
