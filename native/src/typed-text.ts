import { createSignal } from "solid-js";
import { reportAppAction } from "@pocketjs/framework/host";
import { onFrame } from "@pocketjs/framework/solid/lifecycle";
import { textConsume } from "@pocketjs/framework/text-input";

/** Consume text once per host frame; never spin a Promise loop during boot. */
export function createTypedText(limit = 240, active: () => boolean = () => true, allowReturn = true, clearAction = "notes_clear") {
  const [typed, setTyped] = createSignal("");
  let received = 0;
  let started = false;

  function poll(): void {
    if (!active()) return;
    const chunk = textConsume();
    if (chunk.length === 0) return;
    let next = typed();
    for (const item of chunk) {
      for (const ch of item) {
        const cp = ch.codePointAt(0) ?? 0;
        if (cp === 0x08 || cp === 0x7F) {
          const end = next.length;
          const tail = end > 0 ? next.charCodeAt(end - 1) : 0;
          const lead = end > 1 ? next.charCodeAt(end - 2) : 0;
          const pair = tail >= 0xDC00 && tail <= 0xDFFF && lead >= 0xD800 && lead <= 0xDBFF;
          next = next.slice(0, Math.max(0, end - (pair ? 2 : 1)));
        } else if (cp === 0x0A || cp === 0x0D) {
          if (allowReturn) next += " "; // This preview has a single-line headline.
        } else {
          next += ch;
        }
      }
    }
    if (next.length > limit) {
      let offset = next.length - limit;
      const first = next.charCodeAt(offset);
      if (first >= 0xDC00 && first <= 0xDFFF) offset += 1;
      next = next.slice(offset);
    }
    setTyped(next);
    received += chunk.length;
    reportAppAction("text_input", received);
  }

  function start(): void {
    if (started) return;
    started = true;
    onFrame(poll);
  }
  function clear(): void {
    setTyped("");
    reportAppAction(clearAction, 0);
  }
  return { typed, start, clear };
}
