import { createSignal } from "solid-js";
import { onFrame } from "@pocketjs/framework/solid/lifecycle";
import { reportAppAction } from "@pocketjs/framework/host";
export type Message={role:string;content:string};
export function chatLines(text:string,columns=42):string[] {
  const lines:string[]=[];
  for(const source of text.replace(/\r\n?/g,"\n").split("\n")) {
    let row="",width=0;
    for(const c of source) {const ch=c.charCodeAt(0)<32?" ":c,w=(ch.codePointAt(0)||0)>255?2:1;if(width+w>columns){lines.push(row);row="";width=0;}row+=ch;width+=w;}
    lines.push(row);
  }
  return lines;
}
export function createChat(workspace:()=>number,draft:()=>string,clearDraft:()=>void, pageSize:(owner?:number)=>number=()=>7) {
  const api=(globalThis as any).omaAI;
  const [histories,setHistories]=createSignal<Message[][]>([[],[],[],[]]);
  const [errors,setErrors]=createSignal(["","","",""]);
  const [pending,setPending]=createSignal(-1),[offsets,setOffsets]=createSignal([0,0,0,0]),[model,setModel]=createSignal("deepseek-flash");
  const [configured,setConfigured]=createSignal(false);
  let registered=false;
  const rows=()=>pageSize(workspace());
  const offset=()=>offsets()[workspace()];
  function setOffset(value:number,owner=workspace()){const next=offsets().slice();next[owner]=value;setOffsets(next);}
  function updateError(owner:number,message:string){const next=errors().slice();next[owner]=message;setErrors(next);}
  function append(owner:number,message:Message){const next=histories().slice();next[owner]=[...next[owner],message].slice(-20);setHistories(next);}
  function lines(){return chatLines(histories()[workspace()].map(m=>(m.role==="user"?"You: ":"DeepSeek: ")+m.content).join("\n\n") || "Ask DeepSeek about your work.");}
  function send() {
    const text=draft().trim(),owner=workspace();if(!text)return;
    if(pending()>=0){updateError(owner,"A reply is already pending in workspace "+(pending()+1));return;}
    if(!api || !configured()){updateError(owner,"DeepSeek private configuration is missing");return;}
    const messages=[{role:"system",content:"You are the OmaBerry assistant on BlackBerry Q20. Reply concisely in the user's language. Explain commands; never claim to execute them. You cannot access files or run tools."},...histories()[owner],{role:"user",content:text}];
    const body=JSON.stringify({model:model(),messages,stream:false,reasoning_effort:"none",max_tokens:1024});
    if(body.length>28000){updateError(owner,"Conversation is full. Choose New to start again.");return;}
    if(!api.start(body)){const result=api.poll();updateError(owner,result.error || "Request could not start");return;}
    append(owner,{role:"user",content:text});clearDraft();updateError(owner,"");setPending(owner);setOffset(0);reportAppAction("chat_send",owner);
  }
  function cancel() {if(api)api.cancel();if(pending()>=0)updateError(pending(),"Request cancelled");setPending(-1);}
  function reset(){const owner=workspace();if(pending()===owner)cancel();const next=histories().slice();next[owner]=[];setHistories(next);updateError(owner,"");setOffset(0);}
  function start(){if(registered)return;registered=true;if(api){const info=api.info();setConfigured(info.configured);setModel(info.model);}onFrame(()=>{
    if(pending()<0)return;const result=api.poll();if(result.state==="running")return;
    const owner=pending();setPending(-1);
    if(result.error){updateError(owner,result.error);reportAppAction("chat_error",result.httpStatus);return;}
    let response;try{response=JSON.parse(result.body);}catch{updateError(owner,"Invalid provider response (HTTP "+result.httpStatus+")");return;}
    if(result.httpStatus<200 || result.httpStatus>=300){updateError(owner,"DeepSeek HTTP "+result.httpStatus+": "+String(response.error?.message || "Request refused").replace(/sk-[A-Za-z0-9_-]{8,}/g,"[redacted]").slice(0,160));reportAppAction("chat_error",result.httpStatus);return;}
    const choice=response.choices?.[0],content=choice?.message?.content;
    if(typeof content!=="string" || !content.trim()){updateError(owner,"Provider returned no text reply");return;}
    append(owner,{role:"assistant",content});if(choice.finish_reason!=="stop")updateError(owner,"Reply ended: "+choice.finish_reason);
    setOffset(Math.max(0,Math.floor((chatLines(histories()[owner].map(m=>(m.role==="user"?"You: ":"DeepSeek: ")+m.content).join("\n\n")).length-1)/pageSize(owner))*pageSize(owner)),owner);reportAppAction("chat_reply",content.length);
  });}
  return {send,start,cancel,reset,model,configured,pending,histories,
    error:()=>errors()[workspace()],status:()=>pending()===workspace()?"DeepSeek is replying...":configured()?model():"DeepSeek not configured",
    output:()=>lines().slice(Math.min(offset(),Math.max(0,Math.floor((lines().length-1)/rows())*rows())),Math.min(offset(),Math.max(0,Math.floor((lines().length-1)/rows())*rows()))+rows()).join("\n"),
    next:(delta:number)=>setOffset(Math.min(Math.max(0,offset()+delta*rows()),Math.max(0,Math.floor((lines().length-1)/rows())*rows()))),
    page:()=>Math.min(Math.floor(offset()/rows())+1,Math.ceil(lines().length/rows())),pages:()=>Math.max(1,Math.ceil(lines().length/rows()))
  };
}
