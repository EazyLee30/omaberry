import { createSignal } from "solid-js";
import { onFrame } from "@pocketjs/framework/solid/lifecycle";
import { textConsume } from "@pocketjs/framework/text-input";
import { reportAppAction } from "@pocketjs/framework/host";

export class TerminalScreen {
  cols=42; rows=11;
  lines: string[][] = Array.from({length: this.rows}, () => Array(this.cols).fill(" "));
  resize(cols:number,rows:number) {
    cols=Math.max(8,Math.min(80,Math.floor(cols)));rows=Math.max(2,Math.min(40,Math.floor(rows)));
    const shift=Math.max(0,this.y-rows+1);
    this.lines=Array.from({length:rows},(_,i)=>Array.from({length:cols},(_,j)=>this.lines[i+shift]?.[j]||" "));
    this.y=Math.max(0,Math.min(rows-1,this.y-shift));this.x=Math.min(cols-1,this.x);this.cols=cols;this.rows=rows;
  }
  x = 0; y = 0; escape = ""; osc = false; oscEscape = false;
  newline() { this.y++; if(this.y >= this.rows) { this.lines.shift(); this.lines.push(Array(this.cols).fill(" ")); this.y = this.rows-1; } }
  feed(data: string) {
    for(const ch of data) {
      if(this.osc) { if(ch === "\x07" || (this.oscEscape && ch === "\\")) this.osc=false; this.oscEscape=ch === "\x1b"; continue; }
      if(this.escape) {
        this.escape += ch;
        if(this.escape === "\x1b]") {this.osc=true;this.escape="";continue;}
        if(this.escape === "\x1b(" || this.escape === "\x1b)") continue;
        if(this.escape.startsWith("\x1b(") || this.escape.startsWith("\x1b)")) {this.escape="";continue;}
        if(this.escape.length>64) {this.escape="";continue;}
        if(this.escape === "\x1b[") continue;
        if(this.escape.startsWith("\x1b[") && /[0-?]/.test(ch)) continue;
        const p = this.escape.slice(2,-1).split(";").map(n => Number(n) || 0), n = p[0] || 1;
        if(ch === "H" || ch === "f") { this.y = Math.min(this.rows-1,Math.max(0,n-1)); this.x = Math.min(this.cols-1,Math.max(0,(p[1]||1)-1)); }
        if(ch === "A") this.y = Math.max(0,this.y-n);
        if(ch === "B") this.y = Math.min(this.rows-1,this.y+n);
        if(ch === "C") this.x = Math.min(this.cols-1,this.x+n);
        if(ch === "D") this.x = Math.max(0,this.x-n);
        if(ch === "J") {
          if(p[0] === 2 || p[0] === 3) this.lines = Array.from({length:this.rows},()=>Array(this.cols).fill(" "));
          else for(let row=0;row<this.rows;row++) for(let col=0;col<this.cols;col++)
            if(p[0] === 1 ? (row<this.y || (row===this.y && col<=this.x)) : (row>this.y || (row===this.y && col>=this.x))) this.lines[row][col]=" ";
        }
        if(ch === "K") { const mode=p[0]; for(let i=mode===0?this.x:0;i<(mode===1?this.x+1:this.cols);i++) this.lines[this.y][i]=" "; }
        this.escape=""; continue;
      }
      if(ch === "\x1b") {this.escape=ch;continue;}
      if(ch === "\r") {this.x=0;continue;}
      if(ch === "\n") {this.newline();continue;}
      if(ch === "\b") {this.x=Math.max(0,this.x-1);continue;}
      if(ch === "\t") {this.x=Math.min(this.cols-1,(Math.floor(this.x/8)+1)*8);continue;}
      if(ch.charCodeAt(0)<32 || ch === "\x7f") continue;
      if(this.x>=this.cols) {this.x=0;this.newline();}
      this.lines[this.y][this.x++]=ch;
    }
  }
  render() { return this.lines.map(row=>row.join("")).join("\n"); }
}
type Status = {data:string;state:string;error:string;pid:number;exitCode:number;focused:boolean;bytesRead:number};
const api = (globalThis as any).omaTerminal;
export function createTerminal(active:()=>boolean, slot=0) {
  const screen=new TerminalScreen();
  const [output,setOutput]=createSignal(screen.render());
  const [status,setStatus]=createSignal("Shell not started");
  const [sessionState,setSessionState]=createSignal("closed");
  const [focused,setFocused]=createSignal(false);
  let started=false, registered=false, bytes=-1;
  function open() { if(!api) {setStatus("Native PTY unavailable");return;} if(api.open(slot)===false){setStatus("Shell could not start");return;} started=true; api.resize?.(screen.cols,screen.rows,slot); api.focus(true,slot); }
  function focus() { if(!started) open(); else api.focus(true,slot); }
  function send(text:string) { if(started) api.write(text,slot); }
  function restart() { if(api) api.close(slot); screen.lines=Array.from({length:screen.rows},()=>Array(screen.cols).fill(" "));screen.x=screen.y=0;screen.escape="";screen.osc=screen.oscEscape=false;open(); }
  function resize(cols:number,rows:number) {if(screen.cols===cols&&screen.rows===rows)return;screen.resize(cols,rows);setOutput(screen.render());if(started)api.resize?.(cols,rows,slot);}
  function blur() {if(api) api.focus(false,slot);setFocused(false);}
  function start() {if(registered)return;registered=true;onFrame(()=>{
    if(!started)return;
    const s:Status=api.poll(slot);setSessionState(s.state);setFocused(s.focused);
    setStatus(s.error || (s.state === "open" ? "BerryCore /bin/ksh · PID "+s.pid : s.state+" · exit "+s.exitCode));
    if(s.data){screen.feed(s.data);setOutput(screen.render());}
    if(s.bytesRead!==bytes){bytes=s.bytesRead;reportAppAction("terminal_read",bytes);}
    if(active() && s.focused) for(const text of textConsume()) send(text.replace(/\x08/g,"\x7f").replace(/\n/g,"\r"));
  });}
  function close(){if(api)api.close(slot);started=false;setFocused(false);screen.lines=Array.from({length:screen.rows},()=>Array(screen.cols).fill(" "));screen.x=screen.y=0;screen.escape="";screen.osc=screen.oscEscape=false;setOutput(screen.render());setSessionState("closed");}
  return {output,status,sessionState,focused,open,focus,send,restart,blur,start,resize,close};
}
