# Live PocketJS UI in herdr

OmaBerry 0.10.0 treats herdr as one native desktop application. It has its own projects and up to sixteen agent sessions, independent of the desktop's numbered workspaces. There is no separate herdr titlebar. The sidebar reports actual built-in DeepSeek tasks; it does not invent Codex/Claude processes. Every new shell and preview opens as a desktop tile, never a nested layout inside herdr.

## Edit → apply → see

1. Open **herdr** from the logo menu. Use **+ → New agent session** for another session, and **New shell window** for a terminal in the selected project.
2. Ask the agent to change the native preview, for example: `把预览标题改成“你好”，强调色改成绿色，保留计数按钮，应用后检查显示结果。`
3. The agent calls `native_ui` with `action: "source"`. The response contains the real private `ui.js` path, current source and supported component API.
4. `write_file` writes the complete edited source. `native_ui apply` evaluates and validates it, opens the native preview window, and waits for its revision to be presented by the native host.
5. Click the counter or other native buttons. **Reload** applies the current source; **Undo** restores the previous accepted source. **Super + U** opens the preview. The original agent remains attached to its chat while the preview is focused.

External processes running with the app user’s file access can also edit `ui.js`; a one-second file watcher applies changes. The herdr shell starts in that private workspace. Source and button state survive application restarts.

The result exposes `revision`, `displayedRevision`, `nativeFrame`, `visible`, the validated native component tree and current theme. An agent apply only reports `presentation: "presented"` once the matching preview is visible, its menu is closed, and at least two native frames have been presented. A hidden/background preview times out with an explicit error. This is presentation evidence, not a screenshot or a claim that a vision model inspected the pixels.

## Source format

`ui.js` is a JavaScript function body. It receives `ui` and `state`, then returns `{theme?, view}`:

```js
return {
  theme: {accent: "#9ece6a", panel: "#151922"},
  view: ui.View({direction: "column", padding: 10, gap: 8}, [
    ui.Text("你好 / PocketJS", {color: "#9ece6a"}),
    ui.Button("Count: " + (state.count || 0),
      {type: "increment", key: "count", by: 1}),
    ui.Button("Open terminal", {type: "open", app: "terminal"})
  ])
};
```

| API | Native result |
| --- | --- |
| `ui.View(style, children)` | Row or column container |
| `ui.Text(text, style)` | Text with the packaged Latin/common Chinese glyphs |
| `ui.Button(text, action, style)` | Focusable native control |

Styles support `direction` (`row`/`column`), `width`/`height` (1–360 logical units), `padding` (0–24), `gap` (0–16), `grow` (0–1), and `color`/`background`/`border` (`#RRGGBB`). Theme keys are `accent`, `text`, `muted`, `panel`, `sidebar`, `selection`, `border`, and `good`. Theme changes also affect the live herdr frame, tabs and focus borders.

Button actions are `increment` (`key`, `by`), `set` (`key`, primitive `value`), or `open` (`app`: `terminal`, `files`, `chat`, `notes`, `herdr`, `browser`). State is saved after successful interactions. The schema permits at most 80 nodes, depth 8 and 4,000 total text characters. A source/output is at most 64 KiB.

## Recovery and limits

Each evaluation runs in a new QuickJS runtime with an 8 MiB heap, 128 KiB stack and 60 ms execution deadline. It has no host filesystem, process, network, browser or module-import API. Actual command/file operations use the agent’s separate native tools. Syntax errors, invalid trees, infinite loops and memory limits leave the last accepted UI visible with an error message.

The workspace contains `ui.js` (editable candidate), `ui.active.js` (accepted source), `ui.previous.js` (single-step undo) and `ui.state.json` (button state). Do not edit the compiled application bundle for live changes. `native_ui reset` restores the starter module; `rollback` restores the previous accepted source.

This is an editable native UI extension with real layout, controls and theme changes. It does not recompile arbitrary main-desktop TSX, C bindings or baked image/font packs on the phone. The main desktop still uses the reproducible PocketJS build. Upstream herdr’s daemon, SSH host management, detached terminal processes and external-agent discovery are not implemented.

Desktop layouts and herdr sessions are restored across app launches. PTYs start fresh; they are not detached persistent processes. Each chat restores up to 24 recent message excerpts, with 500 characters per message, rather than unlimited tool transcripts.
