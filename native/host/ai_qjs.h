#ifndef OMA_AI_QJS_H
#define OMA_AI_QJS_H
#include "ai_posix.h"
static JSValue ai_config(JSContext *ctx) {
  char bytes[4096];size_t n;FILE *file=fopen("data/deepseek.json","rb");
  if(!file)return JS_NULL;
  n=fread(bytes,1,sizeof(bytes)-1,file);fclose(file);bytes[n]=0;
  return JS_ParseJSON(ctx,bytes,n,"private-config");
}
static JSValue ai_js_info(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv) {
  JSValue config=ai_config(ctx),result=JS_NewObject(ctx),key,model;
  (void)self;(void)argc;(void)argv;
  if(JS_IsException(config)){JSValue error=JS_GetException(ctx);JS_FreeValue(ctx,error);config=JS_NULL;}
  key=JS_IsObject(config)?JS_GetPropertyStr(ctx,config,"apiKey"):JS_UNDEFINED;
  model=JS_IsObject(config)?JS_GetPropertyStr(ctx,config,"model"):JS_UNDEFINED;
  JS_SetPropertyStr(ctx,result,"configured",JS_NewBool(ctx,JS_IsString(key)));
  JS_SetPropertyStr(ctx,result,"model",JS_IsString(model)?JS_DupValue(ctx,model):JS_NewString(ctx,"deepseek-flash"));
  JS_FreeValue(ctx,key);JS_FreeValue(ctx,model);JS_FreeValue(ctx,config);return result;
}
static JSValue ai_js_start(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv) {
  JSValue config,key;const char *token,*body;size_t length;int ok;
  (void)self;if(argc<1)return JS_FALSE;
  config=ai_config(ctx);
  if(JS_IsException(config)){JSValue error=JS_GetException(ctx);JS_FreeValue(ctx,error);config=JS_NULL;}
  key=JS_IsObject(config)?JS_GetPropertyStr(ctx,config,"apiKey"):JS_UNDEFINED;
  token=JS_IsString(key)?JS_ToCString(ctx,key):NULL;body=JS_ToCStringLen(ctx,&length,argv[0]);
  if(!body){JS_FreeCString(ctx,token);JS_FreeValue(ctx,key);JS_FreeValue(ctx,config);return JS_EXCEPTION;}
  if(length>32768){snprintf(ai_error,sizeof(ai_error),"Conversation exceeds 32 KiB");ai_state=2;ok=0;}
  else ok=ai_start(token,body);
  JS_FreeCString(ctx,body);JS_FreeCString(ctx,token);JS_FreeValue(ctx,key);JS_FreeValue(ctx,config);return JS_NewBool(ctx,ok);
}
static JSValue ai_js_poll(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv) {
  JSValue result=JS_NewObject(ctx);(void)self;(void)argc;(void)argv;ai_poll();
  JS_SetPropertyStr(ctx,result,"state",JS_NewString(ctx,ai_state==1?"running":ai_state==2?"done":ai_state==3?"cancelled":"idle"));
  JS_SetPropertyStr(ctx,result,"httpStatus",JS_NewInt32(ctx,ai_status));
  JS_SetPropertyStr(ctx,result,"error",JS_NewString(ctx,ai_error));
  JS_SetPropertyStr(ctx,result,"body",JS_NewStringLen(ctx,ai_state==2?(const char *)ai_response:"",ai_state==2?ai_length:0));return result;
}
static JSValue ai_js_cancel(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv) {(void)ctx;(void)self;(void)argc;(void)argv;ai_cancel();return JS_UNDEFINED;}
static int oma_install_ai(JSContext *ctx,JSValueConst global) {
  JSValue api=JS_NewObject(ctx);
  JS_SetPropertyStr(ctx,api,"info",JS_NewCFunction(ctx,ai_js_info,"info",0));
  JS_SetPropertyStr(ctx,api,"start",JS_NewCFunction(ctx,ai_js_start,"start",1));
  JS_SetPropertyStr(ctx,api,"poll",JS_NewCFunction(ctx,ai_js_poll,"poll",0));
  JS_SetPropertyStr(ctx,api,"cancel",JS_NewCFunction(ctx,ai_js_cancel,"cancel",0));return JS_SetPropertyStr(ctx,global,"omaAI",api)>=0;
}
#endif
