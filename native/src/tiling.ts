import { createSignal } from "solid-js";
export const MAX_WINDOWS=16;
export const WORKSPACE_NAMES=Array.from({length:10},(_,i)=>"Desktop "+(i+1));
export type Tree=number|{axis:"x"|"y";ratio:number;a:Tree;b:Tree}|null;
export type Rect={x:number;y:number;width:number;height:number};
export type Workspace={tree:Tree;focus:number;zoom:boolean;name:string};
export function leaves(t:Tree):number[]{return t===null?[]:typeof t==="number"?[t]:[...leaves(t.a),...leaves(t.b)];}
function replace(t:Tree,id:number,value:Tree):Tree {if(t===id)return value;if(t===null||typeof t==="number")return t;const a=replace(t.a,id,value),b=replace(t.b,id,value);return a===null?b:b===null?a:{...t,a,b};}
function parent(t:Tree,id:number):Exclude<Tree,number|null>|null {if(t===null||typeof t==="number")return null;return t.a===id||t.b===id?t:parent(t.a,id)||parent(t.b,id);}
function minimum(t:Tree,gap:number):{width:number;height:number}{if(t===null||typeof t==="number")return {width:8,height:8};const a=minimum(t.a,gap),b=minimum(t.b,gap);return t.axis==="x"?{width:a.width+b.width+gap,height:Math.max(a.height,b.height)}:{width:Math.max(a.width,b.width),height:a.height+b.height+gap};}
function geometry(t:Tree,r:Rect,gap:number,out:Record<number,Rect>={}) {if(t===null)return out;if(typeof t==="number"){out[t]=r;return out;}const size=(t.axis==="x"?r.width:r.height)-gap,a=minimum(t.a,gap),b=minimum(t.b,gap),n=Math.max(t.axis==="x"?a.width:a.height,Math.min(size-(t.axis==="x"?b.width:b.height),Math.floor(size*t.ratio)));if(t.axis==="x"){geometry(t.a,{...r,width:n},gap,out);geometry(t.b,{...r,x:r.x+n+gap,width:size-n},gap,out);}else{geometry(t.a,{...r,height:n},gap,out);geometry(t.b,{...r,y:r.y+n+gap,height:size-n},gap,out);}return out;}
export function createTiling() {
 const blank=(name:string):Workspace=>({tree:null,focus:-1,zoom:false,name});
 const [workspace,setWorkspace]=createSignal(0),[spaces,setSpaces]=createSignal(WORKSPACE_NAMES.map(blank)),[apps,setApps]=createSignal<number[]>(Array(MAX_WINDOWS).fill(0));
 const [gaps,setGaps]=createSignal(true),[bar,setBar]=createSignal(true);let previous=0;
 const current=()=>spaces()[workspace()],ids=()=>leaves(current().tree),count=()=>ids().length;
 const allIds=(index:number)=>leaves(spaces()[index].tree);
 const area=():Rect=>({x:gaps()?5:0,y:(bar()?24:0)+(gaps()?5:0),width:gaps()?350:360,height:360-(bar()?24:0)-(gaps()?10:0)});
 const rects=()=>current().zoom&&current().focus>=0?{[current().focus]:area()}:geometry(current().tree,area(),gaps()?5:0);
 const rect=(id:number)=>rects()[id]||{x:0,y:0,width:0,height:0};
 function update(value:Workspace,index=workspace()){const next=spaces().slice();next[index]=value;setSpaces(next);}
 function owner(id:number){const space=spaces().findIndex(s=>leaves(s.tree).includes(id));return space<0?null:{space};}
 function rename(name:string){name=name.trim().slice(0,20);if(name)update({...current(),name});}
 function focus(id:number){const o=owner(id);if(!o)return;select(o.space);update({...current(),focus:id});}
 function open(app:number) {if(![1,3,4,6,7,8,9].includes(app))return -1;const id=apps().indexOf(0);if(id<0)return -1;const old=current(),r=rect(old.focus);const node:Tree=old.tree===null?id:{axis:r.width>=r.height?"x":"y",ratio:0.5,a:old.focus,b:id};update({...old,tree:old.tree===null?node:replace(old.tree,old.focus,node),focus:id,zoom:false});const next=apps().slice();next[id]=app;setApps(next);return id;}
 function close(id=current().focus){const o=owner(id);if(!o)return;const old=spaces()[o.space],tree=replace(old.tree,id,null);update({...old,tree,focus:old.focus===id?(leaves(tree).slice(-1)[0]??-1):old.focus,zoom:false},o.space);const next=apps().slice();next[id]=0;setApps(next);}
 function select(i:number){if(i>=0&&i<10&&i!==workspace()){previous=workspace();setWorkspace(i);}}
 function direction(dir:string,swap=false){const id=current().focus,a=rect(id),cx=a.x+a.width/2,cy=a.y+a.height/2;let target=-1,score=Infinity;for(const other of ids()){if(other===id)continue;const b=rect(other),dx=b.x+b.width/2-cx,dy=b.y+b.height/2-cy,forward=dir==="left"?-dx:dir==="right"?dx:dir==="up"?-dy:dy,cross=dir==="left"||dir==="right"?Math.abs(dy):Math.abs(dx);if(forward>0&&forward+cross*2<score){target=other;score=forward+cross*2;}}if(target>=0){if(swap){let tree=replace(current().tree,id,-2);tree=replace(tree,target,id);tree=replace(tree,-2,target);update({...current(),tree});}else focus(target);}return target;}
 function toggleSplit(){const tree=JSON.parse(JSON.stringify(current().tree)),p=parent(tree,current().focus);if(p){p.axis=p.axis==="x"?"y":"x";update({...current(),tree});}}
 function resize(delta:number){const tree=JSON.parse(JSON.stringify(current().tree)),p=parent(tree,current().focus);if(p){p.ratio=Math.max(.15,Math.min(.85,p.ratio+(leaves(p.a).includes(current().focus)?delta:-delta)));update({...current(),tree});}}
 function move(index:number,follow=true){if(index<0||index>=10||index===workspace()||current().focus<0)return;const id=current().focus,old=current(),tree=replace(old.tree,id,null),destination=spaces()[index];update({...old,tree,focus:leaves(tree).slice(-1)[0]??-1,zoom:false});update({...destination,tree:destination.tree===null?id:replace(destination.tree,destination.focus,{axis:"x",ratio:.5,a:destination.focus,b:id}),focus:id,zoom:false},index);if(follow)select(index);}
 function cycle(delta=1){const list=ids();if(list.length)focus(list[(list.indexOf(current().focus)+delta+list.length)%list.length]);}
 function snapshot(){return {version:2,workspace:workspace(),spaces:spaces(),apps:apps()};}
 function restore(raw:any){try{
  if(![1,2].includes(raw?.version)||!Number.isInteger(raw.workspace)||raw.workspace<0||raw.workspace>9||!Array.isArray(raw.spaces)||raw.spaces.length!==10||!Array.isArray(raw.apps)||raw.apps.length!==16)throw 0;
  const nextApps=raw.apps.slice(),seen=new Set<number>();let herdrSeen=false;
  function tree(t:any,depth=0):Tree{if(depth>16)throw 0;if(t===null)return null;if(Number.isInteger(t)&&t>=0&&t<16){if(seen.has(t)||![1,3,4,5,6,7,8,9].includes(nextApps[t]))throw 0;seen.add(t);if(nextApps[t]===5||nextApps[t]===6){if(herdrSeen){nextApps[t]=0;return null;}herdrSeen=true;nextApps[t]=6;}return t;}if(!t||t.a===null||t.b===null||!["x","y"].includes(t.axis)||typeof t.ratio!=="number"||!Number.isFinite(t.ratio)||t.ratio<.15||t.ratio>.85)throw 0;const a=tree(t.a,depth+1),b=tree(t.b,depth+1);return a===null?b:b===null?a:{axis:t.axis,ratio:t.ratio,a,b};}
  const next=raw.spaces.map((s:any,i:number)=>{if(typeof s.name!=="string"||s.name.length>20)throw 0;let layout:Tree=null;
   if(raw.version===1){if(!Array.isArray(s.tabs)||!s.tabs.length||s.tabs.length>8)throw 0;for(const t of s.tabs){const part=tree(t.tree);if(part!==null)layout=layout===null?part:{axis:"x",ratio:.5,a:layout,b:part};}}
   else layout=tree(s.tree);
   const list=leaves(layout),focus=list.includes(s.focus)?s.focus:list[0]??-1;
   return {name:raw.version===1?WORKSPACE_NAMES[i]:s.name,tree:layout,focus,zoom:raw.version===2&&!!s.zoom};
  });
  if(nextApps.some((a:number,i:number)=>seen.has(i)?![0,1,3,4,6,7,8,9].includes(a):a!==0))throw 0;
  setSpaces(next);setApps(nextApps);setWorkspace(raw.workspace);return true;
 }catch{return false;}}
 return {workspace,spaces,apps,current,ids,allIds,count,focus,open,close,select,rects,rect,direction,toggleSplit,resize,move,cycle,gaps,bar,owner,rename,snapshot,restore,
 toggleGaps:()=>setGaps(!gaps()),toggleBar:()=>setBar(!bar()),former:()=>select(previous),toggleZoom:()=>update({...current(),zoom:!current().zoom}),visible:(id:number)=>!!rects()[id]};
}
