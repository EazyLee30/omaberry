/** One foreground PocketJS framebuffer, in physical pixels, including WebKit. */
export function createScreen(input:(args:any)=>any,context:()=>any){
 const api=(globalThis as any).omaScreen;let pending:any=null,last:any=null,signature="";
 const fingerprint=()=>JSON.stringify(context());
 function begin(args:any={action:"observe"}){
  if(pending)throw new Error("Screen observation already pending");
  if(!api?.active())throw new Error("OmaBerry must be in the foreground");
  const wait=args.wait_ms===undefined?350:args.wait_ms;
  if(!Number.isInteger(wait)||wait<0||wait>2000)throw new Error("wait_ms must be 0..2000");
  let actionResult:any={};
  if(args.action!=="observe"){
   if(!last||args.observation!==last.id||Date.now()-last.capturedAt>120000||signature!==fingerprint())throw new Error("Screen changed or observation expired; observe again before acting");
   if(args.action==="click"&&(!Number.isInteger(args.x)||!Number.isInteger(args.y)||args.x<0||args.y<0||args.x>=last.width||args.y>=last.height))throw new Error("Click must be inside the observed physical screen");
   actionResult=input(args);last=null;
  }
  pending={id:0,started:Date.now(),due:Date.now()+wait,actionResult};return {pending:true};
 }
 function poll(){
  if(!pending)return {state:"idle"};
  if(!api.active()||Date.now()-pending.started>12000){const error=!api.active()?"OmaBerry left the foreground":"Screen capture timed out";cancel();return {state:"error",error};}
  if(Date.now()<pending.due)return {state:"pending"};
  if(!pending.id){pending.id=api.request();return {state:"pending"};}
  const r=api.poll();if(r.id!==pending.id)return {state:"pending"};
  if(r.state==="pending")return r;
  const actionResult=pending.actionResult;pending=null;
  if(r.state!=="done"||!/^data:image\/png;base64,/.test(r.dataUrl||"")||r.dataUrl.length>2800000){api.clear();return {state:"error",error:r.error||"Invalid native screenshot"};}
  const {dataUrl,...metadata}=r;last=metadata;signature=fingerprint();api.clear();
  return {...metadata,dataUrl,scope:"OmaBerry foreground framebuffer",coordinates:"physical pixels; origin top-left",context:context(),actionResult};
 }
 function cancel(){pending=null;last=null;api?.clear();}
 return {begin,poll,cancel,last:()=>last};
}
