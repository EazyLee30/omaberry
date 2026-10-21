#ifndef OMA_UI_EVAL_H
#define OMA_UI_EVAL_H
#include "quickjs.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
/* Editable UI programs run in a fresh, bounded QuickJS realm with no host APIs. */
typedef struct {char *json;char error[256];} oma_ui_result;
typedef struct {double deadline;int timed_out;} oma_ui_budget;
static double oui_now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1000.0+t.tv_nsec/1000000.0;}
static int oui_interrupt(JSRuntime *rt,void *opaque){oma_ui_budget *b=opaque;(void)rt;if(oui_now()>b->deadline){b->timed_out=1;return 1;}return 0;}
static oma_ui_result oma_ui_evaluate(const char *source,const char *state){
 oma_ui_result out={0,{0}};JSRuntime *rt=NULL;JSContext *ctx=NULL;JSValue fn=JS_UNDEFINED,args[2]={JS_UNDEFINED,JS_UNDEFINED},value=JS_UNDEFINED,json=JS_UNDEFINED;char *wrapped=NULL;const char *text=NULL;size_t n=source?strlen(source):0,len=0;oma_ui_budget budget={oui_now()+60,0};
 if(!n||n>65536||!state||strlen(state)>8192){snprintf(out.error,sizeof(out.error),"UI source must be 1..65536 bytes; state at most 8192 bytes");return out;}
 rt=JS_NewRuntime();if(!rt)goto memory;JS_SetMemoryLimit(rt,8*1024*1024);JS_SetMaxStackSize(rt,128*1024);JS_SetInterruptHandler(rt,oui_interrupt,&budget);ctx=JS_NewContext(rt);if(!ctx)goto memory;
 const char *api="({View:(style={},children=[])=>({type:'view',style,children}),Text:(text,style={})=>({type:'text',text:String(text),style}),Button:(text,action,style={})=>({type:'button',text:String(text),action,style})})";
 args[0]=JS_Eval(ctx,api,strlen(api),"ui-api.js",JS_EVAL_TYPE_GLOBAL);
 args[1]=JS_ParseJSON(ctx,state,strlen(state),"ui-state.json");if(JS_IsException(args[0])||JS_IsException(args[1]))goto exception;
 wrapped=malloc(n+64);if(!wrapped)goto memory;snprintf(wrapped,n+64,"(function(ui,state){\"use strict\";\n%s\n})",source);fn=JS_Eval(ctx,wrapped,strlen(wrapped),"ui.js",JS_EVAL_TYPE_GLOBAL);if(JS_IsException(fn))goto exception;
 value=JS_Call(ctx,fn,JS_UNDEFINED,2,args);if(JS_IsException(value))goto exception;
 json=JS_JSONStringify(ctx,value,JS_UNDEFINED,JS_UNDEFINED);if(JS_IsException(json))goto exception;
 text=JS_ToCStringLen(ctx,&len,json);if(!text)goto exception;if(len>65536){snprintf(out.error,sizeof(out.error),"UI result exceeds 64 KiB");goto done;}
 out.json=malloc(len+1);if(!out.json)goto memory;memcpy(out.json,text,len+1);goto done;
exception:{JSValue e=JS_GetException(ctx);const char *message=JS_ToCString(ctx,e);snprintf(out.error,sizeof(out.error),"%s",budget.timed_out?"UI evaluation exceeded 60 ms":message?message:"UI evaluation failed");JS_FreeCString(ctx,message);JS_FreeValue(ctx,e);goto done;}
memory:snprintf(out.error,sizeof(out.error),"UI memory limit or allocation failure");
done:if(ctx){JS_FreeCString(ctx,text);JS_FreeValue(ctx,json);JS_FreeValue(ctx,value);JS_FreeValue(ctx,fn);JS_FreeValue(ctx,args[0]);JS_FreeValue(ctx,args[1]);JS_FreeContext(ctx);}if(rt)JS_FreeRuntime(rt);free(wrapped);return out;
}
#endif
