#ifndef OMA_SCREEN_QJS_H
#define OMA_SCREEN_QJS_H
#include "screen_native.h"
static JSValue os_request(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){return JS_NewFloat64(ctx,oma_screen_request());}
static JSValue os_poll(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){const char *json=oma_screen_poll();return JS_ParseJSON(ctx,json,strlen(json),"native-screen");}
static JSValue os_clear(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){oma_screen_clear();return JS_UNDEFINED;}
static JSValue os_active(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){return JS_NewBool(ctx,oma_host_active());}
static JSValue os_click(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){int x=-1,y=-1;if(argc<2||JS_ToInt32(ctx,&x,argv[0])<0||JS_ToInt32(ctx,&y,argv[1])<0)return JS_FALSE;return JS_NewBool(ctx,oma_host_click(x,y));}
static JSValue os_text(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){size_t length;const char *s;int ok;if(!argc)return JS_FALSE;s=JS_ToCStringLen(ctx,&length,argv[0]);if(!s)return JS_EXCEPTION;ok=length<=1024&&oma_host_text(s,length);JS_FreeCString(ctx,s);return JS_NewBool(ctx,ok);}
static int oma_install_screen(JSContext *ctx,JSValueConst global){JSValue o=JS_NewObject(ctx);
#define OS(name,n) JS_SetPropertyStr(ctx,o,#name,JS_NewCFunction(ctx,os_##name,#name,n))
 OS(request,0);OS(poll,0);OS(clear,0);OS(active,0);OS(click,2);OS(text,1);
#undef OS
 return JS_SetPropertyStr(ctx,global,"omaScreen",o)>=0;}
#endif
