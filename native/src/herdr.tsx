import {For} from "solid-js";
import {Text,View} from "@pocketjs/framework/solid/components";
export function HerdrChrome(p:any){
 const wm=p.wm,t=()=>p.theme(),top=()=>wm.bar()?29:5,visibleSpaces=()=>wm.spaces().map((s:any,i:number)=>({name:s.name,i})).filter((s:any)=>s.i<3||s.i===wm.workspace()||wm.allIds(s.i).length).slice(0,5);
 const agents=()=>wm.apps().map((app:number,id:number)=>({app,id})).filter((a:any)=>a.app===5).sort((a:any,b:any)=>Number(b.id===p.agent.pending())-Number(a.id===p.agent.pending())).slice(0,4);
 const state=(id:number)=>p.agent.pending()===id?"working":p.agent.error(id)?"blocked":"idle";
 const tabs=()=>wm.current().tabs.map((tab:any,i:number)=>({name:tab.name,i})).slice(Math.floor(wm.current().selected/3)*3,Math.floor(wm.current().selected/3)*3+3);
 return <View class="absolute left-[5] w-[350] border flex-col" style={{insetT:top(),height:355-top(),bgColor:t().panel,borderColor:t().border}}>
  <View class="absolute left-0 top-0 bottom-0 w-[90] flex-col p-1 overflow-hidden" style={{bgColor:t().sidebar}}>
   <Text class="font-mono text-xs" style={{textColor:t().muted}}>spaces</Text>
   <For each={visibleSpaces()}>{s=><View class="h-[24] px-1 items-center" style={{bgColor:s.i===wm.workspace()?t().selection:t().sidebar}} focusable onPress={()=>p.select(s.i)}><View class="w-[4] h-[4] mr-1" style={{bgColor:s.i===wm.workspace()?t().accent:t().border}}/><Text class="font-mono text-xs" style={{textColor:s.i===wm.workspace()?t().accent:t().text}}>{s.name.slice(0,9)}</Text></View>}</For>
   <View class="h-[20] px-1 items-center" focusable onPress={()=>p.menu("spaces")}><Text class="font-mono text-xs" style={{textColor:t().muted}}>more...</Text></View>
   <View class="h-[1] my-1" style={{bgColor:t().border}}/>
   <Text class="font-mono text-xs" style={{textColor:t().muted}}>agents</Text>
   <For each={agents()}>{a=><View class="h-[34] flex-col px-1 justify-center" focusable onPress={()=>p.focus(a.id)}><View class="flex-row items-center gap-1"><View class="w-[5] h-[5]" style={{bgColor:state(a.id)==="working"?t().good:state(a.id)==="blocked"?"#f7768e":t().muted}}/><Text class="font-mono text-xs" style={{textColor:t().text}}>{"agent "+(a.id+1)}</Text></View><Text class="font-mono text-xs" style={{textColor:t().muted}}>{state(a.id)}</Text></View>}</For>
   <View class="h-[22] px-1 items-center" focusable onPress={()=>p.newTab(5)}><Text class="font-mono text-xs" style={{textColor:t().accent}}>+ agent</Text></View>
  </View>
  <View class="absolute left-[90] top-0 bottom-0 w-[1]" style={{bgColor:t().border}}/>
  <View class="absolute left-[96] right-[4] top-0 h-[23] flex-row items-center gap-1">
   <For each={tabs()}>{tab=><View class="w-[66] h-[22] border items-center px-1" style={{bgColor:tab.i===wm.current().selected?t().selection:t().panel,borderColor:tab.i===wm.current().selected?t().accent:t().border}} focusable onPress={()=>p.selectTab(tab.i)}><Text class="font-mono text-xs" style={{textColor:tab.i===wm.current().selected?t().text:t().muted}}>{tab.name.slice(0,7)}</Text></View>}</For>
   <View class="w-[20] h-[22] items-center justify-center" focusable onPress={()=>p.menu("sessions")}><Text class="font-mono text-xs" style={{textColor:t().accent}}>+</Text></View>
  </View>
  <View class="absolute left-[96] right-[4] bottom-0 h-[16] flex-row items-center justify-between"><Text class="font-mono text-xs" style={{textColor:t().muted}}>{wm.current().name.slice(0,10)+" / "+(wm.current().selected+1)+" of "+wm.current().tabs.length}</Text><Text class="font-mono text-xs" style={{textColor:p.ui.error()?"#f7768e":t().good}}>{p.ui.error()?"UI error":p.agent.pending()>=0?"working":"local"}</Text></View>
 </View>;
}
