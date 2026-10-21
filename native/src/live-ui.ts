import {createSignal} from "solid-js";
import {onFrame} from "@pocketjs/framework/solid/lifecycle";
export const UI_THEME={accent:"#7aa2f7",text:"#c0caf5",muted:"#77819b",panel:"#151922",sidebar:"#1b2029",selection:"#293244",border:"#414868",good:"#9ece6a"};
export const DEFAULT_UI_SOURCE=`// OmaBerry live PocketJS UI. This file is evaluated on the phone.
// Return native View/Text/Button nodes and optional desktop theme colors.
return {
  theme: {accent: "#7aa2f7", panel: "#151922"},
  view: ui.View({direction: "column", padding: 10, gap: 8}, [
    ui.Text("OmaBerry / native UI", {color: "#7aa2f7"}),
    ui.Text("Ask the agent to edit ui.js, then apply the change. The preview updates here.", {height: 60}),
    ui.Button("Count: " + (state.count || 0), {type: "increment", key: "count", by: 1}),
    ui.Button("Open terminal", {type: "open", app: "terminal"})
  ])
};
`;
export const UI_GUIDE="Edit ui.js with write_file then call native_ui apply. JavaScript function body, not JSX: return {theme?,view}. ui.View(style, children), ui.Text(text, style), ui.Button(text, action, style) create PocketJS native nodes. style: direction column/row, width/height 1..360, padding 0..24, gap 0..16, grow 0..1, color/background/border #RRGGBB. Theme keys: accent,text,muted,panel,sidebar,selection,border,good. Button actions: {type:'increment',key:'count',by:1}, {type:'set',key:'name',value:'text'}, {type:'open',app:'terminal'|'files'|'chat'|'notes'}. Read values from state. No imports, DOM, browser, network or shell globals in UI source. Maximum 80 nodes / depth 8 / 4000 text characters. The apply result reports the native presented frame and visible preview; on errors the last good UI remains. rollback restores the previous accepted source.";
const color=(v:any)=>typeof v==="string"&&/^#[0-9a-f]{6}$/i.test(v);
function keys(o:any,allowed:string[],name:string){if(!o||Array.isArray(o)||typeof o!=="object")throw new Error(name+" must be an object");for(const k of Object.keys(o))if(!allowed.includes(k))throw new Error("Unsupported "+name+" property: "+k);}
export function validateUI(raw:any){
 keys(raw,["theme","view"],"document");const theme={...UI_THEME};if(raw.theme){keys(raw.theme,Object.keys(UI_THEME),"theme");for(const k of Object.keys(raw.theme)){if(!color(raw.theme[k]))throw new Error("Invalid color: "+k);(theme as any)[k]=raw.theme[k];}}
 let count=0,characters=0;
 function node(n:any,depth:number):any{if(++count>80||depth>8)throw new Error("UI tree exceeds node/depth limit");keys(n,["type","style","children","text","action"],"node");if(!["view","text","button"].includes(n.type))throw new Error("Unknown native node type");const style=n.style||{};keys(style,["direction","width","height","padding","gap","grow","color","background","border"],"style");
  for(const k of Object.keys(style)){const v=style[k];if(["color","background","border"].includes(k)){if(!color(v))throw new Error("Invalid "+k);}else if(k==="direction"){if(!["row","column"].includes(v))throw new Error("direction must be row or column");}else{const max=k==="padding"?24:k==="gap"?16:k==="grow"?1:360,min=["width","height"].includes(k)?1:0;if(typeof v!=="number"||!Number.isFinite(v)||v<min||v>max)throw new Error("Invalid style "+k);}}
  if(n.type==="view"){if(n.text!==undefined||n.action!==undefined||!Array.isArray(n.children)||n.children.length>24)throw new Error("View requires children only");return {type:n.type,style,children:n.children.map((c:any)=>node(c,depth+1))};}
  if(typeof n.text!=="string"||n.text.length>1000||(characters+=n.text.length)>4000||n.children!==undefined)throw new Error("Invalid or excessive UI text");
  if(n.type==="button"){const a=n.action;keys(a,["type","key","by","value","app"],"action");if(a.type==="open"){if(!["terminal","files","chat","notes"].includes(a.app))throw new Error("Unknown button application");}else if(a.type==="increment"||a.type==="set"){if(typeof a.key!=="string"||!/^[a-z][a-z0-9_]{0,31}$/i.test(a.key)||["constructor","prototype"].includes(a.key))throw new Error("Invalid state key");if(a.type==="increment"&&(typeof a.by!=="number"||!Number.isFinite(a.by)||Math.abs(a.by)>1000))throw new Error("Invalid increment");if(a.type==="set"&&!(typeof a.value==="boolean"||typeof a.value==="number"&&Number.isFinite(a.value)||typeof a.value==="string"&&a.value.length<=256))throw new Error("Invalid state value");}else throw new Error("Unknown button action");}else if(n.action!==undefined)throw new Error("Only buttons have actions");
  return {type:n.type,style,text:n.text,...(n.type==="button"?{action:n.action}:{})};
 }
 return {theme,view:node(raw.view,0)};
}
export function sourceRevision(source:string){let n=2166136261;for(let i=0;i<source.length;i++)n=Math.imul(n^source.charCodeAt(i),16777619);return (n>>>0).toString(16)+"-"+source.length;}
export function createLiveUI(visible:()=>boolean,open:()=>void,launch:(app:string)=>void){
 const g:any=globalThis,api=g.omaUI,files=g.omaFiles,store=g.omaExec;
 const [document,setDocument]=createSignal<any>({theme:UI_THEME,view:{type:"text",text:"Native UI loading",style:{}}}),[error,setError]=createSignal(""),[revision,setRevision]=createSignal(""),[displayed,setDisplayed]=createSignal("");
 const [state,setState]=createSignal<any>({}),[root,setRoot]=createSignal("");let active="",attempted="",target=0,wasVisible=false,lastCheck=0,started=false;
 const path=()=>root()+"/ui.js",activePath=()=>root()+"/ui.active.js",previousPath=()=>root()+"/ui.previous.js";
 function read(p:string){const r=files.read(p);if(r.error||typeof r.text!=="string"||r.truncated)throw new Error(r.error||"UI source is truncated");return r.text;}
 function write(p:string,text:string){const r=store.write(p,text);if(!r.ok)throw new Error(r.error||"Could not save UI source");}
 function evaluate(source:string,s=state()){const r=api.evaluate(source,JSON.stringify(s));if(!r.ok)throw new Error(r.error);return validateUI(JSON.parse(r.json));}
 function activate(source:string,doc:any){active=source;setDocument(doc);setRevision(sourceRevision(source));setDisplayed("");target=api.frame()+2;setError("");}
 function status(){return {ok:!error(),path:path(),revision:revision(),displayedRevision:displayed(),visible:visible(),nativeFrame:api?.frame?.()||0,error:error(),theme:document().theme,view:document().view};}
 function apply(reveal=true,source?:string){try{const next=source??read(path());attempted=next;const doc=evaluate(next);if(next!==active){if(active)write(previousPath(),active);write(activePath(),next);}activate(next,doc);if(reveal)open();return {...status(),ok:true,awaitPresentation:reveal};}catch(e:any){setError(e.message||String(e));return status();}}
 function tool(a:any){switch(a.action){case "source":return {...status(),source:read(path()),guide:UI_GUIDE};case "status":return status();case "apply":return apply(true);case "rollback":try{const source=read(previousPath());evaluate(source);write(path(),source);return apply(true,source);}catch(e:any){setError(e.message);return status();}case "reset":write(path(),DEFAULT_UI_SOURCE);return apply(true,DEFAULT_UI_SOURCE);default:throw new Error("Unknown native_ui action");}}
 function interact(a:any){try{if(a.type==="open"){launch(a.app);return;}const next={...state()};next[a.key]=a.type==="increment"?(Number(next[a.key])||0)+a.by:a.value;const doc=evaluate(active,next);write(root()+"/ui.state.json",JSON.stringify(next));setState(next);activate(active,doc);}catch(e:any){setError(e.message);}}
 function start(){if(started)return;started=true;try{setRoot(api.info().root);try{const r=JSON.parse(read(root()+"/ui.state.json"));if(r&&typeof r==="object"&&!Array.isArray(r))setState(r);}catch{}let saved="";try{saved=read(activePath());activate(saved,evaluate(saved));}catch{activate(DEFAULT_UI_SOURCE,evaluate(DEFAULT_UI_SOURCE));}let source="";try{source=read(path());}catch{source=saved||DEFAULT_UI_SOURCE;write(path(),source);}apply(false,source);}catch(e:any){setError(e.message||String(e));}
  onFrame(()=>{if(!root())return;const show=visible();if(show&&!wasVisible){target=api.frame()+2;setDisplayed("");}wasVisible=show;if(show&&api.frame()>=target&&displayed()!==revision())setDisplayed(revision());if(Date.now()-lastCheck>1000){lastCheck=Date.now();try{const source=read(path());if(source!==attempted)apply(false,source);}catch(e:any){setError(e.message);}}});
 }
 return {start,tool,apply,status,path,root,document,error,revision,displayed,state,interact};
}
