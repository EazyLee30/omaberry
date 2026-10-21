import {createSignal} from "solid-js";
export type Project={name:string;path:string;selected:number};
export type Session={id:number;project:number;name:string};
/** Projects and agent sessions belong to herdr, never to the desktop layout. */
export function createHerdr(root:()=>string){
 const [project,setProject]=createSignal(0),[projects,setProjects]=createSignal<Project[]>([
  {name:"omaberry",path:"",selected:0},{name:"berrycore",path:"/accounts/1000/shared/misc/berrycore",selected:-1},{name:"scratch",path:"/tmp",selected:-1}
 ]),[sessions,setSessions]=createSignal<Session[]>([{id:0,project:0,name:"agent 1"}]);
 const current=()=>projects()[project()],selected=()=>current().selected,path=()=>current().path||root(),visible=()=>sessions().filter(s=>s.project===project());
 function select(id:number){const s=sessions().find(s=>s.id===id);if(!s)return;setProject(s.project);const p=projects().slice();p[s.project]={...p[s.project],selected:id};setProjects(p);}
 function create(){const id=Array.from({length:16},(_,i)=>i).find(i=>!sessions().some(s=>s.id===i));if(id===undefined)return -1;setSessions([...sessions(),{id,project:project(),name:"agent "+(id+1)}]);select(id);return id;}
 function choose(index:number){if(!Number.isInteger(index)||index<0||index>=projects().length)return false;const previous=project();setProject(index);if(selected()<0&&create()<0){setProject(previous);return false;}return true;}
 function directory(next:string){if(typeof next!=="string"||!next.startsWith("/")||next.length>2048||/[\x00-\x1f]/.test(next))return false;const normalized=next.replace(/\/+$/,"" )||"/";const p=projects().slice();p[project()]={...current(),path:normalized};setProjects(p);return true;}
 function cycle(delta:number){const list=visible();if(list.length)select(list[(list.findIndex(s=>s.id===selected())+delta+list.length)%list.length].id);}
 function snapshot(){return {version:1,project:project(),projects:projects(),sessions:sessions()};}
 function restore(raw:any){try{if(raw?.version!==1||!Array.isArray(raw.projects)||raw.projects.length!==3||!Array.isArray(raw.sessions)||!raw.sessions.length||raw.sessions.length>16||!Number.isInteger(raw.project)||raw.project<0||raw.project>2)throw 0;
  const ids=new Set<number>();for(const s of raw.sessions){if(!Number.isInteger(s.id)||s.id<0||s.id>15||ids.has(s.id)||!Number.isInteger(s.project)||s.project<0||s.project>2||typeof s.name!=="string"||s.name.length>24)throw 0;ids.add(s.id);}
  for(let i=0;i<3;i++){const p=raw.projects[i];if(typeof p.name!=="string"||p.name.length>24||typeof p.path!=="string"||(p.path&&!p.path.startsWith("/"))||(p.selected!==-1&&!raw.sessions.some((s:Session)=>s.id===p.selected&&s.project===i)))throw 0;}
  setProjects(raw.projects);setSessions(raw.sessions);setProject(raw.project);return true;
 }catch{return false;}}
 function importHistory(ids:number[]){for(const id of ids){if(id>=0&&id<16&&!sessions().some(s=>s.id===id))setSessions([...sessions(),{id,project:0,name:"agent "+(id+1)}]);}}
 return {project,projects,sessions,current,selected,path,visible,select,create,choose,directory,cycle,snapshot,restore,importHistory};
}
