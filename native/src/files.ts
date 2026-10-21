import { createSignal } from "solid-js";
import { reportAppAction } from "@pocketjs/framework/host";
export type FileEntry = {name:string;directory:boolean;link:boolean;size:number};
export function previewLines(text:string,columns=42):string[] {
  const lines:string[]=[];
  for(const source of text.replace(/\r\n?/g,"\n").split("\n")) {
    let row="",width=0;
    for(const ch of source) {
      const value=ch==="\t"?" ".repeat(4-(width%4)):ch.charCodeAt(0)<32?" ":ch;
      for(const item of value) {const cells=(item.codePointAt(0)||0)>255?2:1;if(row&&width+cells>columns){lines.push(row);row="";width=0;}row+=item;width+=cells;if(width>=columns){lines.push(row);row="";width=0;}}
    }
    if(row || source.length===0) lines.push(row);
  }
  return lines.length?lines:[""];
}
export function fileLabel(name:string):string {
  const chars=Array.from(name.replace(/[\x00-\x1f\x7f]/g,"?"));return chars.length>32?chars.slice(0,31).join("")+"~":chars.join("");
}
export function createFiles(query:()=>string=()=>"", clearQuery:()=>void=()=>{}, listRows:()=>number=()=>5, textRows:()=>number=()=>10, columns:()=>number=()=>42) {
  const api=(globalThis as any).omaFiles;
  const root=api?.root || "/accounts/1000/shared/misc/berrycore";
  const [path,setPath]=createSignal(root),[entries,setEntries]=createSignal<FileEntry[]>([]);
  const [offset,setOffset]=createSignal(0),[error,setError]=createSignal("");
  const [limited,setLimited]=createSignal(false),[selected,setSelected]=createSignal("");
  const [source,setSource]=createSignal("");
  const lines=()=>previewLines(source(),columns());
  const [line,setLine]=createSignal(0),[info,setInfo]=createSignal("");
  let loaded=false;
  const [pagedQuery,setPagedQuery]=createSignal("");
  const filtered=()=>entries().filter(entry=>entry.name.toLowerCase().includes(query().toLowerCase()));
  const listOffset=()=>query()===pagedQuery()?Math.min(Math.floor(offset()/listRows())*listRows(),Math.max(0,Math.floor((filtered().length-1)/listRows())*listRows())):0;
  function load(next=path()) {
    if(!api){setError("Native file access unavailable");return;}
    const result=api.list(next);clearQuery();setPagedQuery("");setPath(next);setEntries(result.entries);setError(result.error);
    setLimited(result.limited);setOffset(0);setSelected("");loaded=true;
    reportAppAction(result.error?"files_error":"files_list",result.entries.length);
  }
  function open(entry:FileEntry) {
    const full=path()+"/"+entry.name;
    if(entry.directory){load(full);return;}
    const result=api.read(full);setSelected(entry.name);setLine(0);setError(result.error);
    setInfo(Math.max(0,result.size)+" bytes"+(result.link?" · link":"")+(result.truncated?" · first 64 KiB":""));
    setSource(result.error|| (result.binary?"Binary file\nText preview is unavailable.":result.text));
    reportAppAction(result.error?"files_error":"files_open",result.size);
  }
  function back() {
    if(selected()){setSelected("");setError("");return;}
    if(query()){clearQuery();setOffset(0);setPagedQuery("");return;}
    if(path()!==root&&path()!=="/")load(path().slice(0,path().lastIndexOf("/")) || "/");
  }
  const previewOffset=()=>Math.min(Math.floor(line()/textRows())*textRows(),Math.max(0,Math.floor((lines().length-1)/textRows())*textRows()));
  function next(delta:number) {
    if(selected())setLine(Math.min(Math.max(0,previewOffset()+delta*textRows()),Math.max(0,Math.floor((lines().length-1)/textRows())*textRows())));
    else {const next=Math.min(Math.max(0,listOffset()+delta*listRows()),Math.max(0,Math.floor((filtered().length-1)/listRows())*listRows()));setPagedQuery(query());setOffset(next);}
  }
  return {load,path,selected,error,info,limited,entries,offset,line,lines,open,back,next,query,filtered,
    enter:()=>{if(!loaded)load();},refresh:()=>load(),home:()=>load(root),
    breadcrumb:()=>path()===root||path().startsWith(root+"/")?"BerryCore"+path().slice(root.length):path(),
    visible:()=>filtered().slice(listOffset(),listOffset()+listRows()),
    preview:()=>lines().slice(previewOffset(),previewOffset()+textRows()).join("\n"),
    page:()=>selected()?Math.floor(previewOffset()/textRows())+1:Math.floor(listOffset()/listRows())+1,
    pages:()=>Math.max(1,Math.ceil((selected()?lines().length:filtered().length)/(selected()?textRows():listRows())))
  };
}
