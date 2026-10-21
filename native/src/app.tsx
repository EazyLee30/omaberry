import {createSignal,Show,For} from "solid-js";
import {Image,Text,View,FocusScope} from "@pocketjs/framework/solid/components";
import {onFrame,onMount} from "@pocketjs/framework/solid/lifecycle";
import {textConsume,resetTextInput} from "@pocketjs/framework/text-input";
import {reportAppAction} from "@pocketjs/framework/host";
import {createLiveUI} from "./live-ui.ts";
import {LivePreview} from "./live-view.tsx";
import {HerdrApp} from "./herdr.tsx";
import {createHerdr} from "./herdr-model.ts";
import {Button} from "./controls.tsx";
import {BrowserPane,createBrowser} from "./browser.tsx";
import {Desktop} from "./desktop.tsx";
import {createChineseText} from "./chinese-text.ts";
import {chatLines} from "./chat.ts";
import {createAgent} from "./agent.ts";
import {createFiles,fileLabel} from "./files.ts";
import {createTerminal} from "./terminal.ts";
import {createTypedText} from "./typed-text.ts";
import {createTiling,WORKSPACE_NAMES,MAX_WINDOWS,leaves} from "./tiling.ts";
const APPS=[{id:3,name:"Terminal",key:"Super + Enter"},{id:4,name:"Files",key:"Super + Shift + F"},{id:1,name:"Notes",key:"Super + Shift + N"},{id:6,name:"herdr",key:"Super + Ctrl + Enter"},{id:7,name:"UI preview",key:"Super + U"},{id:8,name:"Browser",key:"Super + B"},{id:9,name:"System",key:""}];
const title=(app:number)=>APPS.find(a=>a.id===app)?.name||"";
const KEYS=["Q20 Menu = Super (hold)","Tap Menu / logo: menu","Super Enter: terminal","Super W / Q: close window","Super Space: OmaBerry menu","Super Alt Space: apps","Super J: toggle split","Super F: fullscreen","Super arrows / trackpad: focus","Super Shift arrows: swap","Alt Tab: next window","Super 1..0: workspace","Super Shift 1..0: move","Super Tab: next workspace","Super Shift Tab: previous","Super Ctrl Tab: last workspace","Super - / =: resize split","Super Shift F: files","Super Shift N: notes","Super Shift A: herdr","Super Ctrl Enter: herdr","Super T / Shift T: shell / agent","Super [ / ]: previous / next agent","Super U: native UI preview","Super B: browser","Super L: browser address","Alt trackpad: scroll page","Super K: these bindings","Super Shift Space: bar","Super Backspace: opacity","Super Shift Backspace: gaps","Super Ctrl Space: wallpaper","Ctrl combinations: external keyboard"];
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
 const herdr=createHerdr(()=>live.root());
 const herdrWindow=()=>wm.apps().indexOf(6),agentOwner=herdr.selected;
 const drafts=slots.map(id=>createChineseText(()=>herdrWindow()>=0&&active(herdrWindow())&&agentOwner()===id));
 const chatWidth=()=>Math.max(40,wm.rect(herdrWindow()).width-10-(wm.rect(herdrWindow()).width-10>=270?78:0));
 const chatCols=()=>Math.max(5,Math.floor((chatWidth()-8)/8));
 const chatRows=(id:number)=>Math.max(1,Math.floor((wm.rect(herdrWindow()).height-10-(drafts[id]?.mode()?120:86))/12));
 const browser=createBrowser(()=>focusId()>=0&&active(focusId())&&wm.apps()[focusId()]===8,focusId);
 const live=createLiveUI(()=>slots.some(id=>wm.apps()[id]===7&&wm.visible(id))&&!menu(),preview,app=>open(({terminal:3,files:4,chat:6,notes:1,herdr:6,browser:8} as any)[app]));
 const theme=()=>live.document().theme;
 const agent=createAgent(agentOwner,()=>drafts[agentOwner()]?.typed()||"",()=>drafts[agentOwner()]?.clear(),chatRows,chatCols,desktopTool,live.tool,herdrTool,()=>herdr.path(),browserTool);
 const time=()=>{const d=new Date();return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");};
 const [clock,setClock]=createSignal(time());let tick=0,lastSession="",lastHerdr="",sessionAt=0;
 function release(){g.omaInput?.compose(false);terminals.forEach(t=>t.blur());resetTextInput();}
 function sync(){for(const id of wm.ids())if(wm.apps()[id]===3){terminals[id].resize(cols(id),Math.max(2,rows(id)));terminals[id].ensure();}if(menu()){g.omaInput?.compose(true);return;}const id=focusId();if(id<0)return;if(wm.apps()[id]===3)terminals[id].focus();if(wm.apps()[id]===4)files[id].enter();}
 function mutate(fn:()=>void){release();fn();sync();}
 function focus(id:number){mutate(()=>{wm.focus(id);setMenu("");});reportAppAction("tile_focus",id);}
 function act(id:number,fn:()=>void){focus(id);fn();}
 function select(index:number){mutate(()=>{wm.select(index);setMenu("");});reportAppAction("workspace",index);}
 function open(app:number){if(app===5)app=6;let id=-1;const cwd=wm.apps()[focusId()]===6?herdr.path():"";mutate(()=>{setMenu("");if([6,7].includes(app)){id=wm.apps().indexOf(app);if(id>=0){wm.focus(id);return;}}id=wm.open(app);if(id<0){setNotice("16 windows open. Close one with Super W.");return;}if(app===3)terminals[id].ensure(cwd);if(app===8&&!browser.open(id)){wm.close(id);id=-1;setNotice("Browser limit: close another browser window first.");}});reportAppAction("tile_open",app);return id;}
 function newAgent(){const id=herdr.create();if(id<0)setNotice("16 agent sessions. Use Clear this chat in the + menu.");else mutate(()=>{});return id;}
 function session(id:number){mutate(()=>herdr.select(id));}
 function project(id:number){mutate(()=>{if(!herdr.choose(id))setNotice("Project unavailable: all 16 agent sessions are in use.");});}
 function shell(){const cwd=herdr.path();let id=-1;mutate(()=>{setMenu("");id=wm.open(3);if(id>=0)terminals[id].ensure(cwd);});return id;}
 function preview(){open(7);}
 function close(id=focusId()){if(id<0)return;mutate(()=>{if(wm.apps()[id]===6&&agent.pending()>=0)agent.cancel();if(wm.apps()[id]===8)browser.close(id);terminals[id].close();notes[id].clear();searches[id].clear();wm.close(id);});reportAppAction("tile_close",id);}
 function herdrTool(a:any){if(a.action==="session")session(a.session);else if(a.action==="project")project(a.project);else if(a.action==="new"){if(newAgent()<0)throw new Error("Session limit");}else if(a.action==="shell")shell();else if(a.action!=="state")throw new Error("Unknown herdr action");return {...herdr.snapshot(),cwd:herdr.path()};}
 function showMenu(page="root"){mutate(()=>{setMenu(page);setQuery("");setChoice(0);setHelp(0);setNotice("");});}
 function hideMenu(){mutate(()=>setMenu(""));}
 function toggleMenu(){menu()?hideMenu():showMenu();}
 function style(setting:string,value:any){if(setting==="wallpaper"){if(!Number.isInteger(value)||value<0||value>3)throw new Error("wallpaper must be 0..3");if(!g.omaTheme?.set(value))throw new Error("Wallpaper was not saved");setWallpaper(value);}else if(setting==="gaps"&&typeof value==="boolean"){if(wm.gaps()!==value)wm.toggleGaps();}else if(setting==="bar"&&typeof value==="boolean"){if(wm.bar()!==value)wm.toggleBar();}else if(setting==="opacity"&&typeof value==="boolean")setTransparent(value);else throw new Error("Unknown style setting or invalid value");g.omaExec?.write("data/desktop-style.json",JSON.stringify({gaps:wm.gaps(),bar:wm.bar(),opacity:transparent()}));sync();}
 function browserTool(a:any){let id=a.window;if(a.action==="open"){id=open(8);if(id<0)throw new Error("Window limit");if(a.url)browser.load(id,a.url);}else if(a.action!=="state"){if(!Number.isInteger(id)||wm.apps()[id]!==8)throw new Error("Browser window required");if(a.action==="navigate"){if(typeof a.url!=="string")throw new Error("URL required");browser.load(id,a.url);}else if(a.action==="click"){if(!Number.isInteger(a.x)||!Number.isInteger(a.y))throw new Error("Pixel coordinates required");focus(id);if(!g.omaBrowser.click(id,a.x,a.y))throw new Error("Page is hidden, not ready, or coordinates are outside its viewport");}else if(a.action==="type"){if(typeof a.text!=="string"||a.text.length>1024)throw new Error("Text limit 1024");focus(id);if(!g.omaBrowser.text(id,a.text))throw new Error("Page is not ready");}else if(a.action==="scroll"){if(!Number.isInteger(a.value)||Math.abs(a.value)>2000)throw new Error("Scroll range -2000..2000");browser.scroll(id,a.value);}else if(["back","forward","reload","stop"].includes(a.action))browser.action(id,a.action);else throw new Error("Unknown browser action");}return {window:id,windows:slots.filter(i=>wm.apps()[i]===8).map(i=>({id:i,...g.omaBrowser?.state(i)}))};}
 function desktopTool(a:any){const map:any={terminal:3,files:4,chat:6,notes:1,herdr:6,preview:7,browser:8,system:9};switch(a.action){case "state":break;case "open":if(!map[a.app])throw new Error("Unknown app");if(open(map[a.app])<0)throw new Error("Window limit");break;case "workspace":if(!Number.isInteger(a.workspace)||a.workspace<1||a.workspace>10)throw new Error("Workspace must be 1..10");select(a.workspace-1);break;case "rename":if(typeof a.name!=="string"||!a.name.trim())throw new Error("Name required");wm.rename(a.name);break;case "focus":case "close":{const index=wm.spaces().findIndex((_,i)=>wm.allIds(i).includes(a.window));if(index<0)throw new Error("Unknown window");if(a.action==="close"){if(wm.apps()[a.window]===6&&agent.pending()>=0)throw new Error("Cannot close the running agent's herdr window");close(a.window);}else{select(index);focus(a.window);}break;}case "split":mutate(wm.toggleSplit);break;case "fullscreen":mutate(wm.toggleZoom);break;case "resize":if(typeof a.value!=="number"||!Number.isFinite(a.value)||Math.abs(a.value)>.2)throw new Error("Resize delta must be -0.2..0.2");mutate(()=>wm.resize(a.value));break;case "style":mutate(()=>style(a.setting,a.value));break;default:throw new Error("Unknown desktop action");}
  return {workspace:ws()+1,focused:focusId(),style:{wallpaper:wallpaper(),gaps:wm.gaps(),bar:wm.bar(),opacity:transparent()},windows:wm.spaces().flatMap((s,index)=>wm.allIds(index).map(id=>({id,app:title(wm.apps()[id]).toLowerCase(),workspace:index+1,rect:index===ws()?wm.rect(id):null})))};
 }
 const entries=()=>{
  const go=(label:string,page:string)=>({label,hint:">",action:()=>showMenu(page)});
  const command=(label:string,hint:string,action:()=>void)=>({label,hint,action:()=>{hideMenu();action();}});
  let all:any[]=[];
  if(menu()==="root")all=[go("Apps","apps"),go("Learn","learn"),go("Trigger","trigger"),go("Style","style"),go("About","about"),go("System","system")];
  if(menu()==="apps")all=APPS.map(a=>command(a.name,a.key,()=>open(a.id)));
  if(menu()==="spaces")all=wm.spaces().map((s,i)=>command(s.name,String(i+1),()=>select(i)));
  if(menu()==="sessions")all=[command("New shell window","Super T",shell),command("New agent session","Super Shift T",newAgent),command("Clear this chat","",()=>agent.reset()),command("Native UI preview","Super U",preview),command("Reload UI","",()=>live.tool({action:"apply"})),command("Undo UI change","",()=>live.tool({action:"rollback"})),command("Previous agent","Super [",()=>mutate(()=>herdr.cycle(-1))),command("Next agent","Super ]",()=>mutate(()=>herdr.cycle(1)))];
  if(menu()==="learn")all=[go("Keybindings","keys"),go("About OmaBerry","about")];
  if(menu()==="trigger")all=[command("Terminal","Super Enter",()=>open(3)),command("herdr","Super Ctrl Enter",()=>open(6)),command("Close window","Super W / Q",()=>close()),command("Fullscreen","Super F",()=>mutate(wm.toggleZoom)),command("Toggle split","Super J",()=>mutate(wm.toggleSplit)),command("Next window","Alt Tab",()=>mutate(()=>wm.cycle())),command("Previous workspace","Super Shift Tab",()=>select((ws()+9)%10)),command("Stop agent","",()=>agent.cancel())];
  if(menu()==="style")all=[command("Background","Super Ctrl Space",()=>style("wallpaper",(wallpaper()+1)%4)),command("Window gaps","Super Shift Backspace",()=>mutate(()=>style("gaps",!wm.gaps()))),command("Transparency","Super Backspace",()=>style("opacity",!transparent())),command("Top bar","Super Shift Space",()=>mutate(()=>style("bar",!wm.bar()))),command("Liftoff Sunset","1 / 4",()=>style("wallpaper",0))];
  if(menu()==="system")all=[command("Stop agent","",()=>agent.cancel()),command("Close window","Super W / Q",()=>close()),command("Terminal interrupt","Ctrl C",()=>{if(focusId()>=0)terminals[focusId()].send("\x03");}),command("Terminal tab","Tab",()=>{if(focusId()>=0)terminals[focusId()].send("\t");})];
  return all.filter(e=>e.label.toLowerCase().includes(query().toLowerCase()));
 };
 function shortcut(key:string,mods:number){const shift=!!(mods&1),ctrl=!!(mods&2),alt=!!(mods&4),superKey=!!(mods&8);if(key==="menu"){toggleMenu();return;}if(key==="scroll-up"||key==="scroll-down"){const id=focusId(),delta=key==="scroll-up"?-1:1;if(id>=0){if(wm.apps()[id]===6)agent.next(delta,agentOwner());if(wm.apps()[id]===4)files[id].next(delta);if(wm.apps()[id]===3)terminals[id].scroll(delta*6);if(wm.apps()[id]===8)browser.scroll(id,delta*100);}return;}if(!superKey){if(key==="tab"&&alt)mutate(()=>wm.cycle(shift?-1:1));return;}
  if(key==="u"){preview();return;}if(key==="t"){if(shift){open(6);newAgent();}else shell();return;}if(key==="["||key==="]"){mutate(()=>herdr.cycle(key==="["?-1:1));return;}
  if(key==="l"&&wm.apps()[focusId()]===8){browser.edit(focusId());return;}if(key==="b"){open(8);return;}if(key==="enter"){open(ctrl?6:3);return;}if(key==="space"){if(ctrl)style("wallpaper",(wallpaper()+1)%4);else if(shift)mutate(wm.toggleBar);else if(menu()===(alt?"apps":"root"))hideMenu();else showMenu(alt?"apps":"root");return;}
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
  const browserFocus=g.omaBrowser?.takeFocus?.();if(Number.isInteger(browserFocus)&&browserFocus>=0){focus(browserFocus);browser.content(browserFocus);}
  if(++tick%60===0)setClock(time());for(const s of g.omaInput?.shortcuts?.()||[])shortcut(s.key,s.mods);
  if(Date.now()-sessionAt>1000){sessionAt=Date.now();const data=JSON.stringify(wm.snapshot());if(data!==lastSession&&g.omaExec?.write("data/desktop-session.json",data).ok)lastSession=data;const hs=JSON.stringify(herdr.snapshot());if(hs!==lastHerdr&&g.omaExec?.write("data/herdr-app.json",hs).ok)lastHerdr=hs;}
  browser.sync(slots.filter(id=>wm.apps()[id]===8).map(id=>({id,rect:wm.rect(id),visible:wm.visible(id)&&!menu()&&!notice(),focused:active(id)})));
  if(!menu())return;for(const item of textConsume()){
   if(item==="\x1b[A"||item==="\x1b[D"){if(menu()==="keys")setHelp(Math.max(0,help()-1));else setChoice(Math.max(0,choice()-1));continue;}
   if(item==="\x1b[B"||item==="\x1b[C"){if(menu()==="keys")setHelp(Math.min(KEYS.length-12,help()+1));else setChoice(Math.min(entries().length-1,choice()+1));continue;}
   for(const ch of item){if(ch==="\x1b"){hideMenu();return;}if(ch==="\r"||ch==="\n"){entries()[choice()]?.action();return;}if(ch==="\b"||ch==="\x7f"){if(!query()&&menu()!=="root")showMenu();else setQuery(query().slice(0,-1));setChoice(0);}else if(ch.charCodeAt(0)>=32&&query().length<30){setQuery(query()+ch);setChoice(0);}}
  }
 });notes.forEach(n=>n.start());searches.forEach(s=>s.start());terminals.forEach(t=>t.start());drafts.forEach(d=>d.start());agent.start();browser.start();
  try{const stored=JSON.parse(g.omaFiles?.read("data/desktop-style.json").text||"{}");if(stored.gaps===false)wm.toggleGaps();if(stored.bar===false)wm.toggleBar();if(typeof stored.opacity==="boolean")setTransparent(stored.opacity);}catch{}
  try{const stored=g.omaFiles?.read("data/desktop-session.json");wm.restore(JSON.parse(stored?.error?g.omaFiles?.read("data/herdr-session.json").text:stored.text));}catch{}
  try{herdr.restore(JSON.parse(g.omaFiles?.read("data/herdr-app.json").text||"null"));}catch{}
  herdr.importHistory(agent.histories().flatMap((history,id)=>history.length?[id]:[]));
  for(const id of slots)if(wm.apps()[id]===8)browser.open(id,true);
  live.start();sync();});
 return <View debugName="OmaBerryDwindleDesktop" class="w-full h-full bg-[#1a1b26]">
  <Desktop wallpaper={wallpaper}/>
  <Show when={wm.bar()}><View class="absolute left-0 top-0 w-full h-[24] px-2 flex-row items-center gap-2" style={{bgColor:theme().panel}}>
   <View class="w-[22] h-[22] items-center justify-center" focusable onPress={toggleMenu}><Image class="w-[22] h-[22]" src="icon-omaberry.png"/></View>
   <View class="flex-row gap-1"><For each={Array.from({length:Math.min(4,10-Math.floor(ws()/4)*4)},(_,i)=>Math.floor(ws()/4)*4+i)}>{i=><View class={ws()===i?"w-[18] h-[18] items-center justify-center bg-[#7aa2f7]":"w-[18] h-[18] items-center justify-center"} focusable onPress={()=>select(i)}><Text class={ws()===i?"font-mono text-xs text-[#13141c]":"font-mono text-xs text-[#a9b1d6]"}>{i===9?0:i+1}</Text></View>}</For></View>
   <View class="absolute left-[164] top-[4]"><Text class="font-mono text-xs text-[#c0caf5]">{clock()}</Text></View>
  </View></Show>
  <For each={slots}>{id=><Show when={wm.visible(id)}><View class="absolute flex-col border overflow-hidden p-1" style={{insetL:wm.rect(id).x,insetT:wm.rect(id).y,width:wm.rect(id).width,height:wm.rect(id).height,borderColor:focusId()===id?theme().accent:theme().border,bgColor:transparent()?0xe61c1413:theme().panel}}>
   <Show when={wm.apps()[id]===3}><View class="w-full h-full flex-col overflow-hidden" focusable onPress={()=>focus(id)}><Text class="font-mono text-xs text-[#c0caf5]" style={{lineHeight:12}}>{terminals[id].output()}</Text></View></Show>
   <Show when={wm.apps()[id]===4}>
    <View class="h-[16] overflow-hidden" focusable onPress={()=>focus(id)}><Text class="font-mono text-xs text-[#9ece6a]">{files[id].selected()||searches[id].typed()||fileLabel(files[id].breadcrumb())}</Text></View>
    <View class="flex-1 flex-col overflow-hidden" focusable onPress={()=>focus(id)}><Show when={!files[id].selected()}><For each={files[id].visible()}>{entry=><View class="h-[20] flex-col justify-center focus:bg-[#292e42]" focusable onPress={()=>act(id,()=>files[id].open(entry))}><Text class="font-mono text-xs text-[#c0caf5]">{(entry.directory?"+ ":"  ")+fileLabel(entry.name)}</Text></View>}</For><Text class="text-xs text-[#f7768e]">{files[id].error()}</Text></Show><Show when={!!files[id].selected()}><Text class="font-mono text-xs text-[#c0caf5]" style={{lineHeight:12}}>{files[id].preview()}</Text></Show></View>
    <View class="flex-row"><Button label="Back" action={()=>act(id,()=>files[id].back())}/><Button label="<" action={()=>act(id,()=>files[id].next(-1))}/><Button label=">" action={()=>act(id,()=>files[id].next(1))}/><Text class="font-mono text-xs text-[#565f89]">{files[id].page()+"/"+files[id].pages()}</Text></View>
   </Show>
   <Show when={wm.apps()[id]===6}><HerdrApp herdr={herdr} agent={agent} drafts={drafts} theme={theme} width={()=>wm.rect(id).width-10} columns={chatCols} focus={()=>focus(id)} session={session} project={project} newAgent={newAgent} shell={shell} menu={showMenu}/></Show>
   <Show when={wm.apps()[id]===8}><BrowserPane browser={browser} id={id} focus={()=>focus(id)}/></Show>
   <Show when={wm.apps()[id]===9}><View class="w-full h-full flex-col overflow-hidden"><Text class="text-xs text-[#c0caf5]" style={{lineHeight:14}}>{"OmaBerry 0.10.0\nPocketJS / QNX\n\n"+(agent.configured()?"DeepSeek configured":"DeepSeek not configured")+"\n"+live.root()+"\n\nShell: /bin/ksh\nBrowser: native WebKit\nDesktop windows: "+wm.apps().filter(Boolean).length+" / 16\nAgent sessions: "+herdr.sessions().length+" / 16"}</Text><Button label="Open shell" action={()=>open(3)}/><Button label="Open browser" action={()=>open(8)}/></View></Show>
   <Show when={wm.apps()[id]===7}><LivePreview ui={live} width={wm.rect(id).width-10}/></Show>
   <Show when={wm.apps()[id]===1}><View class="flex-1 flex-col overflow-hidden" focusable onPress={()=>focus(id)}><Text class="text-xs text-[#c0caf5]" style={{lineHeight:12}}>{chatLines(notes[id].typed(),cols(id)-3).slice(-rows(id)).map((line,i)=>String(i+1).padStart(2," ")+" "+line).join("\n")||" 1  Start typing..."}</Text></View></Show>
  </View></Show>}</For>
  <Show when={!!notice()}><View class="absolute left-[20] top-[140] w-[320] p-2 bg-[#1a1b26] border border-[#7aa2f7]" focusable onPress={()=>setNotice("")}><Text class="text-xs text-[#c0caf5]">{notice()}</Text></View></Show>
  <Show when={!!menu()}><FocusScope active={()=>true} class="absolute left-[30] w-[300] flex-col border border-[#7aa2f7] p-2" style={{insetT:menu()==="keys"?62:menu()==="about"?105:Math.floor((360-(48+entries().length*24))/2),height:menu()==="keys"?236:menu()==="about"?150:48+entries().length*24,bgColor:0xff1c1413}}>
   <View class="h-[24] flex-row items-center"><Image class="w-[16] h-[16]" src="icon-omaberry.png"/><Text class="font-mono text-xs text-[#a9b1d6]">{"  "+(query()|| (menu()==="root"?"OmaBerry":menu()[0].toUpperCase()+menu().slice(1)))+"_"}</Text></View>
   <For each={entries()}>{(e,i)=><View class={i()===choice()?"h-[24] px-1 flex-row items-center justify-between bg-[#292e42]":"h-[24] px-1 flex-row items-center justify-between focus:bg-[#292e42]"} focusable onPress={e.action}><Text class="font-mono text-xs text-[#c0caf5]">{e.label}</Text><Text class="font-mono text-xs text-[#565f89]">{e.hint}</Text></View>}</For>
   <Show when={menu()==="keys"}><Text class="font-mono text-xs text-[#c0caf5]" style={{lineHeight:14}}>{KEYS.slice(help(),help()+12).join("\n")}</Text><View class="flex-row"><Button label="<" action={()=>setHelp(Math.max(0,help()-12))}/><Button label=">" action={()=>setHelp(Math.min(KEYS.length-12,help()+12))}/></View></Show>
   <Show when={menu()==="about"}><Text class="font-mono text-xs text-[#a9b1d6]" style={{lineHeight:14}}>{"OmaBerry 0.10.0 / QNX\nOmarchy dwindle / Tokyo Liftoff\nBerryCore + DeepSeek tools\nherdr projects + native browser\nMenu key: hold for Super chords\nBackspace: back / Menu: dismiss"}</Text></Show>
  </FocusScope></Show>
 </View>;
}
