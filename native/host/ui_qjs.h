#ifndef OMA_UI_QJS_H
#define OMA_UI_QJS_H
#include "ui_eval.h"
#include <sys/stat.h>
#include <errno.h>
#include <unistd.h>
#include <limits.h>
#include <signal.h>
static unsigned long oui_presented;
void pocket_runtime_ui_presented(void){oui_presented++;}
static JSValue oui_js_frame(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){(void)self;(void)argc;(void)argv;return JS_NewFloat64(ctx,(double)oui_presented);}
static JSValue oui_js_info(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){char path[PATH_MAX];JSValue o=JS_NewObject(ctx);(void)self;(void)argc;(void)argv;if(mkdir("data/workspace",0700)!=0&&errno!=EEXIST)return JS_ThrowInternalError(ctx,"Workspace: %s",strerror(errno));if(!realpath("data/workspace",path))return JS_ThrowInternalError(ctx,"Workspace: %s",strerror(errno));JS_SetPropertyStr(ctx,o,"root",JS_NewString(ctx,path));return o;}
static JSValue oui_js_evaluate(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){const char *source,*state;oma_ui_result r;JSValue o;(void)self;if(argc<2)return JS_ThrowTypeError(ctx,"source and state required");source=JS_ToCString(ctx,argv[0]);state=JS_ToCString(ctx,argv[1]);if(!source||!state){JS_FreeCString(ctx,source);JS_FreeCString(ctx,state);return JS_EXCEPTION;}r=oma_ui_evaluate(source,state);JS_FreeCString(ctx,source);JS_FreeCString(ctx,state);o=JS_NewObject(ctx);JS_SetPropertyStr(ctx,o,"ok",JS_NewBool(ctx,r.json!=NULL));JS_SetPropertyStr(ctx,o,"json",JS_NewString(ctx,r.json?r.json:""));JS_SetPropertyStr(ctx,o,"error",JS_NewString(ctx,r.error));free(r.json);return o;}
static JSValue oui_js_capture(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){(void)ctx;(void)self;(void)argc;(void)argv;return JS_NewBool(ctx,kill(getpid(),SIGUSR1)==0);}
static int oma_install_ui(JSContext *ctx,JSValueConst global){JSValue o=JS_NewObject(ctx);JS_SetPropertyStr(ctx,o,"info",JS_NewCFunction(ctx,oui_js_info,"info",0));JS_SetPropertyStr(ctx,o,"evaluate",JS_NewCFunction(ctx,oui_js_evaluate,"evaluate",2));JS_SetPropertyStr(ctx,o,"frame",JS_NewCFunction(ctx,oui_js_frame,"frame",0));JS_SetPropertyStr(ctx,o,"capture",JS_NewCFunction(ctx,oui_js_capture,"capture",0));return JS_SetPropertyStr(ctx,global,"omaUI",o)>=0;}
#endif
