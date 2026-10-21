import {onFrame} from "@pocketjs/framework/solid/lifecycle";
/** On-device IPC for local harnesses. No network listener and no web bindings. */
export function createControlBridge(root:()=>string,busy:()=>boolean,screen:any,handlers:any){
 const g:any=globalThis;let seen="",job:any=null,tick=0;
 function reply(value:any){g.omaExec.write(root()+"/control-response.json",JSON.stringify({id:job.id,...value}));if(job.ownsKeepAlive)g.omaInput?.keepAlive(false);job=null;}
 function observe(value:any){screen.begin({action:"observe"});job.value=value;job.phase="screen";}
 function start(){try{seen=JSON.parse(g.omaFiles.read(root()+"/control-response.json").text).id||"";}catch{}onFrame(()=>{
  try{
   if(job){
    if(Date.now()-job.started>25000){screen.cancel();reply({error:"Native operation timed out"});return;}
    if(job.phase==="ui"){const r=handlers.native_ui({action:"status"});if(r.error){reply(r);return;}if(r.visible&&r.displayedRevision===job.revision)observe(r);return;}
    const r=screen.poll();if(r.state==="pending")return;const {dataUrl,...metadata}=r;
    reply(r.state==="done"?{result:job.value||{},observation:{...metadata,path:root()+"/../"+metadata.path.replace(/^data\//,"")}}:{error:r.error||"Screen capture failed"});return;
   }
   if(++tick%6||!root())return;
   const file=g.omaFiles.read(root()+"/control-request.json");if(file.error||file.truncated||file.text.length>8192)return;
   const req=JSON.parse(file.text);if(!/^[a-zA-Z0-9-]{1,64}$/.test(req.id||"")||seen===req.id)return;seen=req.id;
   job={id:req.id,started:Date.now()};
   if(!Number.isFinite(req.createdAt)||Math.abs(Date.now()-req.createdAt)>15000){reply({error:"Expired request"});return;}
   if(busy()){reply({error:"Built-in agent is busy"});return;}
   if(!g.omaScreen?.active()){reply({error:"OmaBerry must be foreground"});return;}
   if(!req.args||Array.isArray(req.args)||typeof req.args!=="object")throw new Error("Tool arguments required");
   g.omaInput?.keepAlive(true);job.ownsKeepAlive=true;
   if(req.method==="screen"){screen.begin(req.args);job.phase="screen";return;}
   if(!Object.prototype.hasOwnProperty.call(handlers,req.method))throw new Error("Unknown native control method");
   const value=handlers[req.method](req.args);
   if(value?.awaitPresentation){job.phase="ui";job.revision=value.revision;return;}
   if(["state","source","status"].includes(req.args.action)){reply({result:value});return;}
   observe(value);
  }catch(e:any){if(job){screen.cancel();reply({error:e.message||String(e)});}}
 });}
 return {start,busy:()=>!!job};
}
