import {strict as assert} from "node:assert";
import {unpack} from "../.cache/pocketjs/framework/compiler/pak.ts";
const entries=unpack(new Uint8Array(await Bun.file(new URL("../.cache/pocketjs/dist/blackberry-qnx/guest/blackberry-classic-main.pak",import.meta.url)).arrayBuffer()));
const font=entries.find(e=>e.key==="ui:font.0")!;assert(font);
const dv=new DataView(font.data.buffer,font.data.byteOffset,font.data.byteLength),count=dv.getUint16(6,true);
const mapped=new Map<number,number>();for(let i=0;i<count;i++)mapped.set(dv.getUint32(16+i*8,true),dv.getUint16(20+i*8,true));
for(const ch of "你好黑莓原生助手工作区深度求索中文回复")assert((mapped.get(ch.codePointAt(0)!)||0)>0,ch);
assert(count>7000);for(const entry of entries.filter(e=>e.key.startsWith("ui:font.") && e.key!=="ui:font.0")){const v=new DataView(entry.data.buffer,entry.data.byteOffset,entry.data.byteLength);assert(v.getUint16(6,true)<1000);}
console.log("✓ Native font pack: real common Chinese glyphs in chat slot; other font slots stay bounded");
