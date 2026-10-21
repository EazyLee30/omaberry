import { createSignal } from "solid-js";
export const MAX_WINDOWS=16;
export const WORKSPACE_NAMES=["omaberry","build","scratch","focus",...Array.from({length:6},(_,i)=>"Workspace "+(i+5))];
export type Tree=number|{axis:"x"|"y";ratio:number;a:Tree;b:Tree}|null;
export type Rect={x:number;y:number;width:number;height:number};
export type Tab={tree:Tree;focus:number;zoom:boolean;name:string};
export type Workspace=Tab & {name:string;tabs:Tab[];selected:number};
export function leaves(t:Tree):number[]{return t===null?[]:typeof t==="number"?[t]:[...leaves(t.a),...leaves(t.b)];}
function replace(t:Tree,id:number,value:Tree):Tree {if(t===id)return value;if(t===null||typeof t==="number")return t;const a=replace(t.a,id,value),b=replace(t.b,id,value);return a===null?b:b===null?a:{...t,a,b};}
function parent(t:Tree,id:number):Exclude<Tree,number|null>|null {if(t===null||typeof t==="number")return null;return t.a===id||t.b===id?t:parent(t.a,id)||parent(t.b,id);}
function minimum(t:Tree,gap:number):{width:number;height:number}{if(t===null||typeof t==="number")return {width:8,height:8};const a=minimum(t.a,gap),b=minimum(t.b,gap);return t.axis==="x"?{width:a.width+b.width+gap,height:Math.max(a.height,b.height)}:{width:Math.max(a.width,b.width),height:a.height+b.height+gap};}
function geometry(t:Tree,r:Rect,gap:number,out:Record<number,Rect>={}) {if(t===null)return out;if(typeof t==="number"){out[t]=r;return out;}const size=(t.axis==="x"?r.width:r.height)-gap,a=minimum(t.a,gap),b=minimum(t.b,gap),n=Math.max(t.axis==="x"?a.width:a.height,Math.min(size-(t.axis==="x"?b.width:b.height),Math.floor(size*t.ratio)));if(t.axis==="x"){geometry(t.a,{...r,width:n},gap,out);geometry(t.b,{...r,x:r.x+n+gap,width:size-n},gap,out);}else{geometry(t.a,{...r,height:n},gap,out);geometry(t.b,{...r,y:r.y+n+gap,height:size-n},gap,out);}return out;}
export function createTiling() {
 const blank=(name="shell"):Tab=>({tree:null,focus:-1,zoom:false,name});
 const [workspace,setWorkspace]=createSignal(0),[records,setRecords]=createSignal(WORKSPACE_NAMES.map(name=>({name,tabs:[blank()],selected:0}))),[apps,setApps]=createSignal<number[]>(Array(MAX_WINDOWS).fill(0));
 const [gaps,setGaps]=createSignal(true),[bar,setBar]=createSignal(true),[sidebar,setSidebar]=createSignal(false);let previous=0;
 const spaces=():Workspace[]=>records().map(s=>({...s,...s.tabs[s.selected],name:s.name}));
 const current=()=>spaces()[workspace()],ids=()=>leaves(current().tree),count=()=>ids().length;
 const allIds=(index:number)=>records()[index].tabs.flatMap(t=>leaves(t.tree));
 const area=():Rect=>({x:(sidebar()?96:0)+(gaps()?5:0),y:(bar()?24:0)+(gaps()?5:0)+(sidebar()?24:0),width:(gaps()?350:360)-(sidebar()?96:0),height:360-(bar()?24:0)-(gaps()?10:0)-(sidebar()?42:0)});
 const rects=()=>current().zoom&&current().focus>=0?{[current().focus]:area()}:geometry(current().tree,area(),gaps()?5:0);
 const rect=(id:number)=>rects()[id]||{x:0,y:0,width:0,height:0};
 function update(value:{tree:Tree;focus:number;zoom:boolean},index=workspace(),tab=records()[index].selected){const next=records().slice(),s=next[index],tabs=s.tabs.slice();tabs[tab]={...tabs[tab],tree:value.tree,focus:value.focus,zoom:value.zoom};next[index]={...s,tabs};setRecords(next);}
 function owner(id:number){for(let space=0;space<10;space++){const tab=records()[space].tabs.findIndex(t=>leaves(t.tree).includes(id));if(tab>=0)return {space,tab};}return null;}
 function selectTab(index:number){const next=records().slice(),s=next[workspace()];if(index<0||index>=s.tabs.length)return;next[workspace()]={...s,selected:index};setRecords(next);}
 function newTab(name="shell"){const next=records().slice(),s=next[workspace()];if(s.tabs.length>=8||apps().indexOf(0)<0)return false;next[workspace()]={...s,tabs:[...s.tabs,blank(name.slice(0,20))],selected:s.tabs.length};setRecords(next);return true;}
 function rename(name:string,tab=false){name=name.trim().slice(0,20);if(!name)return;const next=records().slice(),s=next[workspace()];if(tab){const tabs=s.tabs.slice();tabs[s.selected]={...tabs[s.selected],name};next[workspace()]={...s,tabs};}else next[workspace()]={...s,name};setRecords(next);}
 function focus(id:number){const o=owner(id);if(!o)return;select(o.space);selectTab(o.tab);update({...current(),focus:id});}
 function open(app:number) {if(![1,3,4,5,7].includes(app))return -1;const id=apps().indexOf(0);if(id<0)return -1;const old=current(),r=rect(old.focus);const node:Tree=old.tree===null?id:{axis:r.width>=r.height?"x":"y",ratio:0.5,a:old.focus,b:id};update({...old,tree:old.tree===null?node:replace(old.tree,old.focus,node),focus:id,zoom:false});const next=apps().slice();next[id]=app;setApps(next);return id;}
 function close(id=current().focus){const o=owner(id);if(!o)return;const old=records()[o.space].tabs[o.tab],tree=replace(old.tree,id,null);update({...old,tree,focus:old.focus===id?(leaves(tree).slice(-1)[0]??-1):old.focus,zoom:false},o.space,o.tab);if(tree===null&&records()[o.space].tabs.length>1){const next=records().slice(),s=next[o.space],tabs=s.tabs.filter((_,i)=>i!==o.tab);next[o.space]={...s,tabs,selected:Math.max(0,Math.min(tabs.length-1,s.selected-(o.tab<s.selected?1:0)))};setRecords(next);}const next=apps().slice();next[id]=0;setApps(next);}
 function select(i:number){if(i>=0&&i<10&&i!==workspace()){previous=workspace();setWorkspace(i);}}
 function direction(dir:string,swap=false){const id=current().focus,a=rect(id),cx=a.x+a.width/2,cy=a.y+a.height/2;let target=-1,score=Infinity;for(const other of ids()){if(other===id)continue;const b=rect(other),dx=b.x+b.width/2-cx,dy=b.y+b.height/2-cy,forward=dir==="left"?-dx:dir==="right"?dx:dir==="up"?-dy:dy,cross=dir==="left"||dir==="right"?Math.abs(dy):Math.abs(dx);if(forward>0&&forward+cross*2<score){target=other;score=forward+cross*2;}}if(target>=0){if(swap){let tree=replace(current().tree,id,-2);tree=replace(tree,target,id);tree=replace(tree,-2,target);update({...current(),tree});}else focus(target);}return target;}
 function toggleSplit(){const tree=JSON.parse(JSON.stringify(current().tree)),p=parent(tree,current().focus);if(p){p.axis=p.axis==="x"?"y":"x";update({...current(),tree});}}
 function resize(delta:number){const tree=JSON.parse(JSON.stringify(current().tree)),p=parent(tree,current().focus);if(p){p.ratio=Math.max(.15,Math.min(.85,p.ratio+(leaves(p.a).includes(current().focus)?delta:-delta)));update({...current(),tree});}}
 function move(index:number,follow=true){if(index<0||index>=10||index===workspace()||current().focus<0)return;const id=current().focus,old=current(),tree=replace(old.tree,id,null),destination=spaces()[index];update({tree,focus:leaves(tree).slice(-1)[0]??-1,zoom:false});update({tree:destination.tree===null?id:replace(destination.tree,destination.focus,{axis:"x",ratio:.5,a:destination.focus,b:id}),focus:id,zoom:false},index);if(follow)select(index);}
 function cycle(delta=1){const list=ids();if(list.length)focus(list[(list.indexOf(current().focus)+delta+list.length)%list.length]);}
 function snapshot(){return {version:1,workspace:workspace(),spaces:records(),apps:apps(),sidebar:sidebar()};}
 function restore(raw:any){try{if(raw?.version!==1||!Number.isInteger(raw.workspace)||raw.workspace<0||raw.workspace>9||!Array.isArray(raw.spaces)||raw.spaces.length!==10||!Array.isArray(raw.apps)||raw.apps.length!==16)throw 0;const seen=new Set<number>();
  function tree(t:any,depth=0):Tree{if(depth>16)throw 0;if(t===null)return null;if(Number.isInteger(t)&&t>=0&&t<16){if(seen.has(t)||![1,3,4,5,7].includes(raw.apps[t]))throw 0;seen.add(t);return t;}if(!t||t.a===null||t.b===null||!["x","y"].includes(t.axis)||typeof t.ratio!=="number"||!Number.isFinite(t.ratio)||t.ratio<.15||t.ratio>.85)throw 0;return {axis:t.axis,ratio:t.ratio,a:tree(t.a,depth+1),b:tree(t.b,depth+1)};}
  const next=raw.spaces.map((s:any)=>{if(typeof s.name!=="string"||!s.name.trim()||s.name.length>20||!Array.isArray(s.tabs)||!s.tabs.length||s.tabs.length>8||!Number.isInteger(s.selected)||s.selected<0||s.selected>=s.tabs.length)throw 0;const tabs=s.tabs.map((t:any)=>{const layout=tree(t.tree),list=leaves(layout);if(typeof t.name!=="string"||t.name.length>20||typeof t.zoom!=="boolean"||!((!list.length&&t.focus===-1)||list.includes(t.focus)))throw 0;return {name:t.name,tree:layout,focus:t.focus,zoom:t.zoom};});return {name:s.name,tabs,selected:s.selected};});
  if(raw.apps.some((a:number,i:number)=>seen.has(i)?![1,3,4,5,7].includes(a):a!==0))throw 0;setRecords(next);setApps(raw.apps.slice());setWorkspace(raw.workspace);setSidebar(!!raw.sidebar);return true;
 }catch{return false;}}
 return {workspace,spaces,apps,current,ids,allIds,count,focus,open,close,select,rects,rect,direction,toggleSplit,resize,move,cycle,gaps,bar,owner,newTab,selectTab,rename,snapshot,restore,
 sidebar,setSidebar,toggleGaps:()=>setGaps(!gaps()),toggleBar:()=>setBar(!bar()),former:()=>select(previous),toggleZoom:()=>update({...current(),zoom:!current().zoom}),visible:(id:number)=>!!rects()[id]};
}
