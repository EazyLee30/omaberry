import {For,Show} from "solid-js";
import {Text,View} from "@pocketjs/framework/solid/components";
import {Button} from "./controls.tsx";
import {chatLines} from "./chat.ts";
/** A regular desktop application: projects and agent tabs stay inside its bounds. */
export function HerdrApp(p:any){
 const h=p.herdr,t=()=>p.theme(),id=()=>h.selected(),draft=()=>p.drafts[id()],wide=()=>p.width()>=270;
 const act=(fn:()=>void)=>{p.focus();fn();};
 const state=(sid:number)=>p.agent.status(sid);
 const tabs=()=>h.visible().slice(Math.floor(Math.max(0,h.visible().findIndex((s:any)=>s.id===id()))/2)*2).slice(0,2);
 return <View class="w-full h-full flex-row overflow-hidden">
  <Show when={wide()}><View class="w-[78] h-full flex-col p-1 overflow-hidden" style={{bgColor:t().sidebar}}>
   <Text class="font-mono text-xs" style={{textColor:t().muted}}>projects</Text>
   <For each={h.projects()}>{(project,i)=><View class="h-[24] px-1 justify-center focus:bg-[#414868]" style={{bgColor:i()===h.project()?t().selection:t().sidebar}} focusable onPress={()=>act(()=>p.project(i()))}><Text class="text-xs" style={{textColor:i()===h.project()?t().accent:t().text}}>{project.name}</Text></View>}</For>
   <View class="h-[1] my-1" style={{bgColor:t().border}}/><Text class="font-mono text-xs" style={{textColor:t().muted}}>agents</Text>
   <For each={h.visible().slice(-4)}>{s=><View class="h-[32] flex-col px-1 justify-center focus:bg-[#414868]" focusable onPress={()=>act(()=>p.session(s.id))}><Text class="text-xs" style={{textColor:s.id===id()?t().accent:t().text}}>{s.name}</Text><Text class="font-mono text-xs" style={{textColor:state(s.id)==="idle"?t().muted:t().good}}>{state(s.id)}</Text></View>}</For>
   <Button label="+ agent" action={()=>act(p.newAgent)}/><Button label="+ shell" action={()=>act(p.shell)}/>
  </View></Show>
  <View class="flex-1 h-full flex-col overflow-hidden">
   <View class="h-[22] flex-row overflow-hidden" style={{bgColor:t().sidebar}}>
    <Show when={!wide()}><Button label={h.current().name} action={()=>act(()=>p.project((h.project()+1)%3))}/></Show>
    <For each={tabs()}>{s=><Button label={s.name} selected={s.id===id()} action={()=>act(()=>p.session(s.id))}/>}</For><Button label="+" action={()=>act(()=>p.menu("sessions"))}/>
   </View>
   <View class="flex-1 flex-col p-1 overflow-hidden focus:bg-[#202332]" focusable onPress={p.focus}><Text class="text-xs" style={{lineHeight:12,textColor:t().text}}>{p.agent.output(id())}</Text></View>
   <Show when={draft()?.mode()}><View class="h-[14] overflow-hidden"><Text class="font-mono text-xs" style={{textColor:t().accent}}>{draft().composition()||"Pinyin"}</Text></View><View class="h-[20] flex-row overflow-hidden"><For each={draft().visible()}>{(candidate,i)=><Button label={String(i()+1)+" "+Array.from(candidate).slice(0,2).join("")} selected={i()===draft().index()%3} action={()=>act(()=>draft().choose(i()))}/>}</For><Button label=">" action={()=>act(()=>draft().move(3))}/></View></Show>
   <View class="h-[28] px-1 border flex-col overflow-hidden focus:bg-[#292e42]" style={{borderColor:t().border}} focusable onPress={p.focus}><Text class="text-xs" style={{lineHeight:12,textColor:t().text}}>{chatLines(p.agent.error(id())||draft()?.typed()||"",p.columns()).slice(-2).join("\n")||"> Message"}</Text></View>
   <View class="h-[20] flex-row overflow-hidden"><Button label="Send" action={()=>act(()=>{if(draft()?.commit())p.agent.send();})}/><Button label={p.agent.pending()===id()?"Stop":"New"} action={()=>act(()=>p.agent.pending()===id()?p.agent.cancel():p.newAgent())}/><Button label={draft()?.mode()?"ABC":"CN"} action={()=>act(()=>draft()?.toggle())}/><Button label="<" action={()=>act(()=>p.agent.next(-1,id()))}/><Button label=">" action={()=>act(()=>p.agent.next(1,id()))}/></View>
   <View class="h-[14] overflow-hidden"><Text class="font-mono text-xs" style={{textColor:t().muted}}>{h.current().name+" / "+state(id())}</Text></View>
  </View>
 </View>;
}
