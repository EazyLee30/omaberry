import {createSignal,Show,For} from "solid-js";
import {Image,Text,View,FocusScope} from "@pocketjs/framework/solid/components";
import {onFrame,onMount} from "@pocketjs/framework/solid/lifecycle";
import {textConsume,resetTextInput} from "@pocketjs/framework/text-input";
import {reportAppAction} from "@pocketjs/framework/host";
import {Desktop} from "./desktop.tsx";
import {createChineseText} from "./chinese-text.ts";
import {chatLines} from "./chat.ts";
import {createAgent} from "./agent.ts";
import {createFiles,fileLabel} from "./files.ts";
import {createTerminal} from "./terminal.ts";
import {createTypedText} from "./typed-text.ts";
import {createTiling,WORKSPACE_NAMES,MAX_WINDOWS,leaves} from "./tiling.ts";
const APPS=[{id:3,name:"Terminal",key:"Super + Enter"},{id:4,name:"Files",key:"Super + Shift + F"},{id:5,name:"Chat",key:"Super + Shift + A"},{id:1,name:"Notes",key:"Super + Shift + N"},{id:6,name:"herdr",key:"Super + Ctrl + Enter"}];
const title=(app:number)=>APPS.find(a=>a.id===app)?.name||"";
const KEYS=["Q20 Menu = Super (hold)","Tap Menu / logo: menu","Super Enter: terminal","Super W / Q: close window","Super Space: OmaBerry menu","Super Alt Space: apps","Super J: toggle split","Super F: fullscreen","Super arrows / trackpad: focus","Super Shift arrows: swap","Alt Tab: next window","Super 1..0: workspace","Super Shift 1..0: move","Super Tab: next workspace","Super Shift Tab: previous","Super Ctrl Tab: last workspace","Super - / =: resize split","Super Shift F: files","Super Shift N: notes","Super Shift A: agent chat","Super Ctrl Enter: herdr","Super K: these bindings","Super Shift Space: bar","Super Backspace: opacity","Super Shift Backspace: gaps","Super Ctrl Space: wallpaper","Ctrl combinations: external keyboard"];
function Button(p:any){return <View class="h-[20] px-1 justify-center focus:bg-[#414868] active:bg-[#565f89]" focusable onPress={()=>p.action()}><Text class="font-mono text-xs text-[#7aa2f7]">{p.label}</Text></View>;}
export default function OmaBerryDesktop(){
 const wm=createTiling(),ws=wm.workspace,g:any=globalThis;
 const [menu,setMenu]=createSignal(""),[query,setQuery]=createSignal(""),[choice,setChoice]=createSignal(0),[help,setHelp]=createSignal(0),[notice,setNotice]=createSignal("");
 const [wallpaper,setWallpaper]=createSignal(g.omaTheme?.get()||0),[transparent,setTransparent]=createSignal(true);
 const focusId=()=>wm.current().focus,active=(id:number)=>!menu()&&focusId()===id&&wm.ids().includes(id);
 const cols=(id:number)=>Math.max(8,Math.floor((wm.rect(id).width-10)/8)),rows=(id:number,reserve=0)=>Math.max(1,Math.floor((wm.rect(id).height-10-reserve)/12));
 const slots=Array.from({length:MAX_WINDOWS},(_,i)=>i);
 const terminals=slots.map(id=>createTerminal(()=>active(id)&&wm.apps()[id]===3,id));
 const notes=slots.map(id=>createTypedText(1200,()=>active(id)&&wm.apps()[id]===1,false));
 const searches=slots.map(id=>createTypedText(48,()=>active(id)&&wm.apps()[id]===4&&!files[id].selected(),false,"files_filter_clear"));
 const files=slots.map(id=>createFiles(searches[id].typed,searches[id].clear,()=>Math.max(1,Math.floor((wm.rect(id).height-56)/20)),()=>rows(id,42),()=>cols(id)));
 const drafts=slots.map(id=>createChineseText(()=>active(id)&&wm.apps()[id]===5));
 const chatRows=(id:number)=>rows(id,drafts[id]?.mode()?108:74);
 const agent=createAgent(focusId,()=>drafts[focusId()]?.typed()||"",()=>drafts[focusId()]?.clear(),chatRows,cols,desktopTool);
 const time=()=>{const d=new Date();return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");};
 const [clock,setClock]=createSignal(time());let tick=0;
 function release(){g.omaInput?.compose(false);terminals.forEach(t=>t.blur());resetTextInput();}
 function sync(){for(const id of wm.ids())if(wm.apps()[id]===3)terminals[id].resize(cols(id),Math.max(2,rows(id)));if(menu()){g.omaInput?.compose(true);return;}const id=focusId();if(id<0)return;if(wm.apps()[id]===3)terminals[id].focus();if(wm.apps()[id]===4)files[id].enter();}
 function mutate(fn:()=>void){release();fn();sync();}
 function focus(id:number){mutate(()=>{wm.focus(id);setMenu("");});reportAppAction("tile_focus",id);}
 function act(id:number,fn:()=>void){focus(id);fn();}
 function select(index:number){mutate(()=>{wm.select(index);setMenu("");});reportAppAction("workspace",index);}
 function open(app:number){let id=-1;mutate(()=>{setMenu("");if(app===6){wm.setSidebar(!wm.sidebar());if(!wm.count())id=wm.open(3);}else{id=wm.open(app);if(id<0)setNotice("16 windows open. Close one with Super W.");}});reportAppAction("tile_open",app);return id;}
 function close(id=focusId()){if(id<0)return;mutate(()=>{if(agent.pending()===id)agent.cancel();terminals[id].close();notes[id].clear();searches[id].clear();drafts[id].clear();agent.reset(id);wm.close(id);});reportAppAction("tile_close",id);}
 function showMenu(page="root"){mutate(()=>{setMenu(page);setQuery("");setChoice(0);setHelp(0);setNotice("");});}
 function hideMenu(){mutate(()=>setMenu(""));}
 function toggleMenu(){menu()?hideMenu():showMenu();}
 function style(setting:string,value:any){if(setting==="wallpaper"){if(!Number.isInteger(value)||value<0||value>3)throw new Error("wallpaper must be 0..3");if(!g.omaTheme?.set(value))throw new Error("Wallpaper was not saved");setWallpaper(value);}else if(setting==="gaps"&&typeof value==="boolean"){if(wm.gaps()!==value)wm.toggleGaps();}else if(setting==="bar"&&typeof value==="boolean"){if(wm.bar()!==value)wm.toggleBar();}else if(setting==="opacity"&&typeof value==="boolean")setTransparent(value);else throw new Error("Unknown style setting or invalid value");g.omaExec?.write("data/desktop-style.json",JSON.stringify({gaps:wm.gaps(),bar:wm.bar(),opacity:transparent()}));sync();}
 function desktopTool(a:any){const map:any={terminal:3,files:4,chat:5,notes:1,herdr:6};switch(a.action){case "state":break;case "open":if(!map[a.app])throw new Error("Unknown app");if(open(map[a.app])<0&&a.app!=="herdr")throw new Error("Window limit");break;case "workspace":if(!Number.isInteger(a.workspace)||a.workspace<1||a.workspace>10)throw new Error("Workspace must be 1..10");select(a.workspace-1);break;case "focus":case "close":{const index=wm.spaces().findIndex(s=>leaves(s.tree).includes(a.window));if(index<0)throw new Error("Unknown window");if(a.action==="close"){if(a.window===agent.pending())throw new Error("Cannot close the running agent's chat");close(a.window);}else{select(index);focus(a.window);}break;}case "split":mutate(wm.toggleSplit);break;case "fullscreen":mutate(wm.toggleZoom);break;case "resize":if(typeof a.value!=="number"||!Number.isFinite(a.value)||Math.abs(a.value)>.2)throw new Error("Resize delta must be -0.2..0.2");mutate(()=>wm.resize(a.value));break;case "style":mutate(()=>style(a.setting,a.value));break;default:throw new Error("Unknown desktop action");}
  return {workspace:ws()+1,focused:focusId(),herdr:wm.sidebar(),style:{wallpaper:wallpaper(),gaps:wm.gaps(),bar:wm.bar(),opacity:transparent()},windows:wm.spaces().flatMap((s,index)=>leaves(s.tree).map(id=>({id,app:title(wm.apps()[id]).toLowerCase(),workspace:index+1,rect:index===ws()?wm.rect(id):null,agent:agent.status(id)})))};
 }
 const entries=()=>{
  const go=(label:string,page:string)=>({label,hint:">",action:()=>showMenu(page)});
  const command=(label:string,hint:string,action:()=>void)=>({label,hint,action:()=>{hideMenu();action();}});
  let all:any[]=[];
  if(menu()==="root")all=[go("Apps","apps"),go("Learn","learn"),go("Trigger","trigger"),go("Style","style"),go("About","about"),go("System","system")];
  if(menu()==="apps")all=APPS.map(a=>command(a.name,a.key,()=>open(a.id)));
  if(menu()==="learn")all=[go("Keybindings","keys"),go("About OmaBerry","about")];
  if(menu()==="trigger")all=[command("Terminal","Super Enter",()=>open(3)),command("herdr","Super Ctrl Enter",()=>open(6)),command("Close window","Super W / Q",()=>close()),command("Fullscreen","Super F",()=>mutate(wm.toggleZoom)),command("Toggle split","Super J",()=>mutate(wm.toggleSplit)),command("Next window","Alt Tab",()=>mutate(()=>wm.cycle())),command("Previous workspace","Super Shift Tab",()=>select((ws()+9)%10)),command("Stop agent","",()=>agent.cancel())];
  if(menu()==="style")all=[command("Background","Super Ctrl Space",()=>style("wallpaper",(wallpaper()+1)%4)),command("Window gaps","Super Shift Backspace",()=>mutate(()=>style("gaps",!wm.gaps()))),command("Transparency","Super Backspace",()=>style("opacity",!transparent())),command("Top bar","Super Shift Space",()=>mutate(()=>style("bar",!wm.bar()))),command("Liftoff Sunset","1 / 4",()=>style("wallpaper",0))];
  if(menu()==="system")all=[command("Stop agent","",()=>agent.cancel()),command("Close window","Super W / Q",()=>close()),command("Terminal interrupt","Ctrl C",()=>{if(focusId()>=0)terminals[focusId()].send("\x03");}),command("Terminal tab","Tab",()=>{if(focusId()>=0)terminals[focusId()].send("\t");})];
  return all.filter(e=>e.label.toLowerCase().includes(query().toLowerCase()));
 };
 function shortcut(key:string,mods:number){const shift=!!(mods&1),ctrl=!!(mods&2),alt=!!(mods&4),superKey=!!(mods&8);if(key==="menu"){toggleMenu();return;}if(!superKey){if(key==="tab"&&alt)mutate(()=>wm.cycle(shift?-1:1));return;}
  if(key==="enter"){open(ctrl?6:3);return;}if(key==="space"){if(ctrl)style("wallpaper",(wallpaper()+1)%4);else if(shift)mutate(wm.toggleBar);else if(menu()===(alt?"apps":"root"))hideMenu();else showMenu(alt?"apps":"root");return;}
  if(key==="w"||key==="q"){hideMenu();close();return;}if(key==="k"){showMenu("keys");return;}
  if(key==="escape"){showMenu("system");return;}if(key==="f"&&shift){open(4);return;}if(key==="n"&&shift){open(1);return;}if(key==="a"&&shift){open(5);return;}
  if(/^[0-9]$/.test(key)){const i=(Number(key)+9)%10;mutate(()=>{setMenu("");if(shift)wm.move(i,!alt);else wm.select(i);});return;}
  if(key==="tab"){if(ctrl)mutate(wm.former);else select((ws()+(shift?9:1))%10);return;}
  if(key==="backspace"){if(shift)mutate(wm.toggleGaps);else setTransparent(!transparent());return;}
  if(key==="j"){mutate(wm.toggleSplit);return;}if(key==="f"){mutate(wm.toggleZoom);return;}
  if(["up","down","left","right"].includes(key)){mutate(()=>wm.direction(key,shift));return;}
  if(key==="-"||key==="="||key==="+"){mutate(()=>wm.resize((key==="-"?-.05:.05)*(ctrl?2:alt?.5:1)));}
 }
 onMount(()=>{onFrame(()=>{
  if(++tick%60===0)setClock(time());for(const s of g.omaInput?.shortcuts?.()||[])shortcut(s.key,s.mods);
  if(!menu())return;for(const item of textConsume()){
   if(item==="\x1b[A"||item==="\x1b[D"){if(menu()==="keys")setHelp(Math.max(0,help()-1));else setChoice(Math.max(0,choice()-1));continue;}
   if(item==="\x1b[B"||item==="\x1b[C"){if(menu()==="keys")setHelp(Math.min(KEYS.length-12,help()+1));else setChoice(Math.min(entries().length-1,choice()+1));continue;}
   for(const ch of item){if(ch==="\x1b"){hideMenu();return;}if(ch==="\r"||ch==="\n"){entries()[choice()]?.action();return;}if(ch==="\b"||ch==="\x7f"){if(!query()&&menu()!=="root")showMenu();else setQuery(query().slice(0,-1));setChoice(0);}else if(ch.charCodeAt(0)>=32&&query().length<30){setQuery(query()+ch);setChoice(0);}}
  }
 });notes.forEach(n=>n.start());searches.forEach(s=>s.start());terminals.forEach(t=>t.start());drafts.forEach(d=>d.start());agent.start();
  try{const stored=JSON.parse(g.omaFiles?.read("data/desktop-style.json").text||"{}");if(stored.gaps===false)wm.toggleGaps();if(stored.bar===false)wm.toggleBar();if(typeof stored.opacity==="boolean")setTransparent(stored.opacity);}catch{}
  sync();});
 return <View debugName="OmaBerryDwindleDesktop" class="w-full h-full bg-[#1a1b26]">
  <Desktop wallpaper={wallpaper}/>
  <Show when={wm.bar()}><View class="absolute left-0 top-0 w-full h-[24] px-2 flex-row items-center gap-2" style={{bgColor:0xf51c1413}}>
   <View class="w-[22] h-[22] items-center justify-center" focusable onPress={toggleMenu}><Image class="w-[22] h-[22]" src="icon-omaberry.png"/></View>
   <View class="flex-row gap-1"><For each={Array.from({length:Math.min(4,10-Math.floor(ws()/4)*4)},(_,i)=>Math.floor(ws()/4)*4+i)}>{i=><View class={ws()===i?"w-[18] h-[18] items-center justify-center bg-[#7aa2f7]":"w-[18] h-[18] items-center justify-center"} focusable onPress={()=>select(i)}><Text class={ws()===i?"font-mono text-xs text-[#13141c]":"font-mono text-xs text-[#a9b1d6]"}>{i===9?0:i+1}</Text></View>}</For></View>
   <View class="absolute left-[164] top-[4]"><Text class="font-mono text-xs text-[#c0caf5]">{clock()}</Text></View>
  </View></Show>
  <Show when={wm.sidebar()}><View class="absolute left-0 bottom-0 w-[96] px-1 flex-col overflow-hidden" style={{insetT:wm.bar()?24:0,bgColor:0xff262221}}>
   <Text class="font-mono text-xs text-[#c0caf5]">herdr</Text>
   <For each={WORKSPACE_NAMES.map((name,i)=>({name,i})).filter(s=>s.i<4||s.i===ws()||leaves(wm.spaces()[s.i].tree).length)}>{s=><View class={s.i===ws()?"h-[28] px-1 flex-col justify-center bg-[#292e42]":"h-[28] px-1 flex-col justify-center focus:bg-[#292e42]"} focusable onPress={()=>select(s.i)}><Text class="font-mono text-xs text-[#a9b1d6]">{s.i+1+" "+s.name}</Text></View>}</For>
   <Button label="new shell" action={()=>open(3)}/><Button label="new agent" action={()=>open(5)}/>
   <Text class="font-mono text-xs text-[#565f89]">agents</Text>
   <For each={slots.filter(id=>wm.apps()[id]===5)}>{id=><View class="h-[32] flex-col focus:bg-[#292e42]" focusable onPress={()=>{const owner=wm.spaces().findIndex(s=>leaves(s.tree).includes(id));select(owner);focus(id);}}><Text class="font-mono text-xs text-[#c0caf5]">{"  deepseek "+(id+1)}</Text><Text class="font-mono text-xs text-[#9ece6a]">{agent.status(id)}</Text></View>}</For>
  </View></Show>
  <For each={slots}>{id=><Show when={wm.visible(id)}><View class="absolute flex-col border overflow-hidden p-1" style={{insetL:wm.rect(id).x,insetT:wm.rect(id).y,width:wm.rect(id).width,height:wm.rect(id).height,borderColor:focusId()===id?"#7aa2f7":"#414868",bgColor:transparent()?0xe61c1413:0xff1c1413}}>
   <Show when={wm.apps()[id]===3}><View class="w-full h-full flex-col overflow-hidden" focusable onPress={()=>focus(id)}><Text class="font-mono text-xs text-[#c0caf5]" style={{lineHeight:12}}>{terminals[id].output()}</Text></View></Show>
   <Show when={wm.apps()[id]===4}>
    <View class="h-[16] overflow-hidden" focusable onPress={()=>focus(id)}><Text class="font-mono text-xs text-[#9ece6a]">{files[id].selected()||searches[id].typed()||fileLabel(files[id].breadcrumb())}</Text></View>
    <View class="flex-1 flex-col overflow-hidden" focusable onPress={()=>focus(id)}><Show when={!files[id].selected()}><For each={files[id].visible()}>{entry=><View class="h-[20] flex-col justify-center focus:bg-[#292e42]" focusable onPress={()=>act(id,()=>files[id].open(entry))}><Text class="font-mono text-xs text-[#c0caf5]">{(entry.directory?"+ ":"  ")+fileLabel(entry.name)}</Text></View>}</For><Text class="text-xs text-[#f7768e]">{files[id].error()}</Text></Show><Show when={!!files[id].selected()}><Text class="font-mono text-xs text-[#c0caf5]" style={{lineHeight:12}}>{files[id].preview()}</Text></Show></View>
    <View class="flex-row"><Button label="Back" action={()=>act(id,()=>files[id].back())}/><Button label="<" action={()=>act(id,()=>files[id].next(-1))}/><Button label=">" action={()=>act(id,()=>files[id].next(1))}/><Text class="font-mono text-xs text-[#565f89]">{files[id].page()+"/"+files[id].pages()}</Text></View>
   </Show>
   <Show when={wm.apps()[id]===5}>
    <View class="flex-1 flex-col overflow-hidden" focusable onPress={()=>focus(id)}><Text class="text-xs text-[#c0caf5]" style={{lineHeight:12}}>{agent.output(id)}</Text></View>
    <Show when={drafts[id].mode()}><View class="h-[14] overflow-hidden" focusable onPress={()=>focus(id)}><Text class="font-mono text-xs text-[#7aa2f7]">{drafts[id].composition()||"Pinyin"}</Text></View><View class="h-[20] flex-row overflow-hidden"><For each={drafts[id].visible()}>{(c,i)=><Button label={String(i()+1)+" "+Array.from(c).slice(0,3).join("")} action={()=>act(id,()=>drafts[id].choose(i()))}/>}</For><Button label=">" action={()=>act(id,()=>drafts[id].move(3))}/></View></Show>
    <View class="h-[28] px-1 border border-[#414868] flex-col overflow-hidden" focusable onPress={()=>focus(id)}><Text class="text-xs text-[#c0caf5]" style={{lineHeight:12}}>{chatLines(agent.error(id)||drafts[id].typed(),cols(id)).slice(-2).join("\n")||"> Message"}</Text></View>
    <View class="h-[14] overflow-hidden"><Text class="font-mono text-xs text-[#565f89]">{agent.status(id)}</Text></View>
    <View class="h-[20] flex-row overflow-hidden"><Button label="Send" action={()=>act(id,()=>{if(drafts[id].commit())agent.send();})}/><Button label={agent.pending()===id?"Stop":"New"} action={()=>act(id,()=>agent.pending()===id?agent.cancel():agent.reset())}/><Button label={drafts[id].mode()?"ABC":"CN"} action={()=>act(id,()=>drafts[id].toggle())}/><Button label="<" action={()=>act(id,()=>agent.next(-1,id))}/><Button label=">" action={()=>act(id,()=>agent.next(1,id))}/></View>
   </Show>
   <Show when={wm.apps()[id]===1}><View class="flex-1 flex-col overflow-hidden" focusable onPress={()=>focus(id)}><Text class="text-xs text-[#c0caf5]" style={{lineHeight:12}}>{chatLines(notes[id].typed(),cols(id)-3).slice(-rows(id)).map((line,i)=>String(i+1).padStart(2," ")+" "+line).join("\n")||" 1  Start typing..."}</Text></View></Show>
  </View></Show>}</For>
  <Show when={!!notice()}><View class="absolute left-[20] top-[140] w-[320] p-2 bg-[#1a1b26] border border-[#7aa2f7]" focusable onPress={()=>setNotice("")}><Text class="text-xs text-[#c0caf5]">{notice()}</Text></View></Show>
  <Show when={!!menu()}><FocusScope active={()=>true} class="absolute left-[30] w-[300] flex-col border border-[#7aa2f7] p-2" style={{insetT:menu()==="keys"?62:menu()==="about"?105:Math.floor((360-(48+entries().length*24))/2),height:menu()==="keys"?236:menu()==="about"?150:48+entries().length*24,bgColor:0xff1c1413}}>
   <View class="h-[24] flex-row items-center"><Image class="w-[16] h-[16]" src="icon-omaberry.png"/><Text class="font-mono text-xs text-[#a9b1d6]">{"  "+(query()|| (menu()==="root"?"OmaBerry":menu()[0].toUpperCase()+menu().slice(1)))+"_"}</Text></View>
   <For each={entries()}>{(e,i)=><View class={i()===choice()?"h-[24] px-1 flex-row items-center justify-between bg-[#292e42]":"h-[24] px-1 flex-row items-center justify-between focus:bg-[#292e42]"} focusable onPress={e.action}><Text class="font-mono text-xs text-[#c0caf5]">{e.label}</Text><Text class="font-mono text-xs text-[#565f89]">{e.hint}</Text></View>}</For>
   <Show when={menu()==="keys"}><Text class="font-mono text-xs text-[#c0caf5]" style={{lineHeight:14}}>{KEYS.slice(help(),help()+12).join("\n")}</Text><View class="flex-row"><Button label="<" action={()=>setHelp(Math.max(0,help()-12))}/><Button label=">" action={()=>setHelp(Math.min(KEYS.length-12,help()+12))}/></View></Show>
   <Show when={menu()==="about"}><Text class="font-mono text-xs text-[#a9b1d6]" style={{lineHeight:14}}>{"OmaBerry 0.8.1 / QNX\nOmarchy dwindle / Tokyo Liftoff\nBerryCore + DeepSeek tools\nherdr native workspace adaptation\nMenu key: hold for Super chords\nBackspace: back / Menu: dismiss"}</Text></Show>
  </FocusScope></Show>
 </View>;
}
