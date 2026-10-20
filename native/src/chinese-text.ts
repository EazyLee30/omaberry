import { createSignal } from "solid-js";
import { onFrame } from "@pocketjs/framework/solid/lifecycle";
import { textConsume } from "@pocketjs/framework/text-input";
import { reportAppAction } from "@pocketjs/framework/host";
let dictionary:any;
function data(){
  if(!dictionary){try{const file=(globalThis as any).omaFiles.read("app/native/pinyin.json");dictionary=file.error||file.truncated?{}:JSON.parse(file.text);}catch{dictionary={};}}
  return dictionary;
}
export function pinyinCandidates(raw:string,source:any):string[]{
  const text=raw.toLowerCase().replace(/'/g,""),words=source.words||{},syllables=source.syllables||{};
  if(!text)return [];
  const exact=[...(words[text]||[]),...Array.from(syllables[text]||"") as string[]];
  if(exact.length)return [...new Set(exact)];
  const memo=new Map<number,string|null>();
  function segment(start:number):string|null{
    if(start===text.length)return "";if(memo.has(start))return memo.get(start)!;
    for(let end=text.length;end>start;end--){const key=text.slice(start,end),head=words[key]?.[0]||Array.from(syllables[key]||"")[0];if(head){const rest=segment(end);if(rest!==null){const value=head+rest;memo.set(start,value);return value;}}}
    memo.set(start,null);return null;
  }
  const result=segment(0);return result?[result]:[];
}
export function createChineseText(active:()=>boolean){
  const [typed,setTyped]=createSignal(""),[mode,setMode]=createSignal(false),[composition,setComposition]=createSignal("");
  const [index,setIndex]=createSignal(0);let started=false;
  const candidates=()=>pinyinCandidates(composition(),data());
  function capture(){if(active())(globalThis as any).omaInput?.compose(mode() && composition().length>0);}
  function append(text:string){const chars=Array.from(typed()+text);setTyped(chars.slice(-320).join(""));}
  function select(selected=index()){
    const value=candidates()[selected];if(!value)return false;append(value);setComposition("");setIndex(0);capture();reportAppAction("ime_commit",Array.from(value).length);return true;
  }
  function commit(){return !composition() || select();}
  function move(delta:number){const count=candidates().length;if(count)setIndex((index()+delta+count)%count);}
  function toggle(){if(mode() && composition()){append(composition());setComposition("");}setMode(!mode());setIndex(0);capture();}
  function clear(){setTyped("");setComposition("");setIndex(0);capture();}
  function input(items:string[]){
    for(const item of items){if(mode() && composition() && /^\x1b\[[ABCD]$/.test(item)){move(item.endsWith("A")||item.endsWith("D")?-1:1);continue;}
      for(const ch of item){
        if(ch==="\b"||ch==="\x7f"){if(composition())setComposition(composition().slice(0,-1));else setTyped(Array.from(typed()).slice(0,-1).join(""));setIndex(0);}
        else if(mode() && /^[a-zA-Z']$/.test(ch)){if(composition().length<32)setComposition(composition()+ch.toLowerCase());setIndex(0);}
        else if(mode() && composition() && /^[1-3]$/.test(ch)){select(Math.floor(index()/3)*3+Number(ch)-1);}
        else if(ch==="\r"||ch==="\n"){if(mode() && composition())select();}
        else if(ch===" " && mode() && composition()){select();}
        else if(ch.charCodeAt(0)>=32){if(!composition()||select()){const punctuation:any={",":"，",".":"。","?":"？","!":"！",":":"：",";":"；"};append(mode()?(punctuation[ch]||ch):ch);}}
      }
    }
    capture();
  }
  function start(){if(started)return;started=true;onFrame(()=>{if(active()){input(textConsume());}});}
  return {typed,mode,composition,candidates,index,select,commit,move,toggle,clear,start,input,
    visible:()=>candidates().slice(Math.floor(index()/3)*3,Math.floor(index()/3)*3+3),
    choose:(position:number)=>select(Math.floor(index()/3)*3+position)
  };
}
