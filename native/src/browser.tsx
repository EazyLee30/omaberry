import {createSignal} from "solid-js";
import {Text,View} from "@pocketjs/framework/solid/components";
import {onFrame} from "@pocketjs/framework/solid/lifecycle";
import {textConsume} from "@pocketjs/framework/text-input";
import {Button} from "./controls.tsx";
export function normalizeURL(input:string){const s=input.trim();if(!s)return "about:blank";if(s==="about:blank"||/^https?:\/\//i.test(s)||/^file:\/\//.test(s))return s;if(/^[a-z][a-z0-9+.-]*:/i.test(s))throw new Error("Use http, https or file URLs");return "https://"+s;}
export function createBrowser(active:()=>boolean,owner:()=>number){
 const g:any=globalThis,api=g.omaBrowser;
 let urls:string[]=Array(16).fill("about:blank");
 const save=()=>g.omaExec?.write("data/browser-state.json",JSON.stringify(urls));
 const [states,setStates]=createSignal<any[]>(Array.from({length:16},()=>({url:"about:blank",title:"Browser",error:"",loading:false}))),[editing,setEditing]=createSignal(-1),[address,setAddress]=createSignal("");
 let registered=false;
 function state(id:number){return states()[id];}
 function open(id:number,restore=false){if(!api){const s=states().slice();s[id]={...s[id],error:"Native web engine unavailable"};setStates(s);return false;}if(!api.open(id)){const s=states().slice();s[id]={...s[id],error:"Browser limit: close another browser window"};setStates(s);return false;}api.load(id,restore?urls[id]:"about:blank");return true;}
 function edit(id:number){setEditing(id);setAddress("");api?.focus(-1);(globalThis as any).omaInput?.compose(true);}
 function go(id:number){try{api?.load(id,normalizeURL(address()));setEditing(-1);(globalThis as any).omaInput?.compose(false);api?.focus(id);}catch(e:any){const s=states().slice();s[id]={...s[id],error:e.message};setStates(s);}}
 function content(id:number){setEditing(-1);(globalThis as any).omaInput?.compose(false);api?.focus(id);}
 function action(id:number,name:string){api?.action(id,name);}
 function sync(panes:any[]){for(const p of panes){const r=p.rect;api?.layout(p.id,r.x+5,r.y+47,Math.max(0,r.width-10),Math.max(0,r.height-67),p.visible&&r.width>20&&r.height>75);if(p.focused&&editing()!==p.id)api?.focus(p.id);}if(!panes.some(p=>p.focused)||editing()>=0)api?.focus(-1);}
 function start(){if(registered)return;registered=true;try{const stored=JSON.parse(g.omaFiles?.read("data/browser-state.json").text||"null");if(Array.isArray(stored)&&stored.length===16)urls=stored.map(value=>{try{return typeof value==="string"&&value.length<=2048?normalizeURL(value):"about:blank";}catch{return "about:blank";}});}catch{}let tick=0;onFrame(()=>{if(++tick%15===0&&api){const s=states().slice();let changed=false;for(let id=0;id<16;id++){const r=api.state(id);if(r){s[id]=r;if(r.url&&r.url!==urls[id]){urls[id]=r.url;changed=true;}}}setStates(s);if(changed)save();}if(!active()||editing()!==owner())return;(globalThis as any).omaInput?.compose(true);for(const item of textConsume()){if(/^\x1b\[[ABCD]$/.test(item))continue;for(const c of item){if(c==="\r"||c==="\n"){go(owner());return;}if(c==="\x1b"){setEditing(-1);return;}if(c==="\b"||c==="\x7f")setAddress(address().slice(0,-1));else if(c.charCodeAt(0)>=32&&address().length<2048)setAddress(address()+c);}}});}
 return {load:(id:number,url:string)=>{api?.load(id,normalizeURL(url));},open,state,editing,address,edit,go,content,action,sync,start,scroll:(id:number,dy:number)=>api?.scroll(id,dy),close:(id:number)=>{api?.close(id);urls[id]="about:blank";save();if(editing()===id)setEditing(-1);}};
}
export function BrowserPane(p:any){const b=p.browser,id=p.id;const act=(fn:()=>void)=>{p.focus();fn();};return <View class="w-full h-full flex-col overflow-hidden">
 <View class="h-[22] px-1 border border-[#414868] justify-center focus:bg-[#292e42]" focusable onPress={()=>act(()=>b.edit(id))}><Text class="text-xs text-[#c0caf5]">{b.editing()===id?b.address()+"_":b.state(id).url}</Text></View>
 <View class="h-[20] flex-row overflow-hidden"><Button label="<" action={()=>act(()=>b.action(id,"back"))}/><Button label=">" action={()=>act(()=>b.action(id,"forward"))}/><Button label={b.state(id).loading?"Stop":"Reload"} action={()=>act(()=>b.action(id,b.state(id).loading?"stop":"reload"))}/><Button label={b.editing()===id?"Go":"URL"} action={()=>act(()=>b.editing()===id?b.go(id):b.edit(id))}/></View>
 <View class="flex-1 overflow-hidden" focusable onPress={()=>act(()=>b.content(id))}/>
 <View class="h-[15] overflow-hidden"><Text class="text-xs text-[#a9b1d6]">{b.state(id).error||(!b.state(id).ready?"Starting web engine...":b.state(id).title||"WebKit")}</Text></View>
 </View>;}
