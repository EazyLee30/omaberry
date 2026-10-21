import {For,Show} from "solid-js";
import {Text,View} from "@pocketjs/framework/solid/components";
import {chatLines} from "./chat.ts";
export function LiveNode(p:any){
 const s=()=>p.node.style||{},pad=()=>s().padding||0,style=()=>({...(s().width?{width:s().width}:{}),...(s().height?{height:s().height}:{}),paddingT:pad(),paddingR:pad(),paddingB:pad(),paddingL:pad(),gap:s().gap||0,grow:s().grow||0,...(s().background?{bgColor:s().background}:{}),...(s().border?{borderWidth:1,borderColor:s().border}:{})});
 return <Show when={p.node.type==="view"} fallback={<Show when={p.node.type==="button"} fallback={<Text class="text-xs" style={{...style(),textColor:s().color||p.theme.text,lineHeight:14}}>{chatLines(p.node.text,Math.max(4,Math.floor((p.width-2*pad())/7))).join("\n")}</Text>}>
  <View class="min-h-[28] px-2 justify-center border focus:bg-[#293244]" style={{...style(),bgColor:s().background||p.theme.selection,borderColor:s().border||p.theme.border}} focusable onPress={()=>p.press(p.node.action)}><Text class="text-xs" style={{textColor:s().color||p.theme.accent,lineHeight:14}}>{p.node.text}</Text></View>
 </Show>}>
  <View class={s().direction==="row"?"flex-row overflow-hidden":"flex-col overflow-hidden"} style={style()}><For each={p.node.children}>{n=><LiveNode node={n} theme={p.theme} width={s().width||p.width-2*pad()} press={p.press}/>}</For></View>
 </Show>;
}
export function LivePreview(p:any){return <View class="w-full h-full flex-col overflow-hidden">
 <View class="h-[20] flex-row items-center justify-between"><Text class="font-mono text-xs" style={{textColor:p.ui.document().theme.muted}}>ui.js</Text><View class="flex-row gap-2"><View focusable onPress={()=>p.ui.tool({action:"apply"})}><Text class="text-xs text-[#7aa2f7]">Reload</Text></View><View focusable onPress={()=>p.ui.tool({action:"rollback"})}><Text class="text-xs text-[#7aa2f7]">Undo</Text></View></View></View>
 <View class="flex-1 flex-col overflow-hidden" style={{bgColor:p.ui.document().theme.panel}}><LiveNode node={p.ui.document().view} theme={p.ui.document().theme} width={p.width} press={p.ui.interact}/></View>
 <Text class="text-xs" style={{textColor:p.ui.error()?"#f7768e":p.ui.document().theme.muted,lineHeight:12}}>{p.ui.error()?chatLines(p.ui.error(),Math.max(8,Math.floor(p.width/7))).slice(0,3).join("\n"):"native / "+p.ui.revision()}</Text>
 </View>;}
