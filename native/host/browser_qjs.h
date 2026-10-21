#ifndef OMA_BROWSER_QJS_H
#define OMA_BROWSER_QJS_H
#include "browser_native.h"
static int ob_id(JSContext *ctx,int argc,JSValueConst *argv){int id=-1;if(argc)JS_ToInt32(ctx,&id,argv[0]);return id;}
static JSValue ob_open(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){return JS_NewBool(ctx,oma_browser_open(ob_id(ctx,argc,argv)));}
static JSValue ob_close(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){oma_browser_close(ob_id(ctx,argc,argv));return JS_UNDEFINED;}
static JSValue ob_focus(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){oma_browser_focus(ob_id(ctx,argc,argv));return JS_UNDEFINED;}
static JSValue ob_layout(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){int v[6],i;if(argc<6)return JS_UNDEFINED;for(i=0;i<5;i++)if(JS_ToInt32(ctx,&v[i],argv[i])<0)return JS_EXCEPTION;v[5]=JS_ToBool(ctx,argv[5]);oma_browser_layout(v[0],v[1],v[2],v[3],v[4],v[5]);return JS_UNDEFINED;}
static JSValue ob_load(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){const char *s;if(argc<2)return JS_UNDEFINED;s=JS_ToCString(ctx,argv[1]);if(!s)return JS_EXCEPTION;if(strlen(s)>2048){JS_FreeCString(ctx,s);return JS_ThrowRangeError(ctx,"URL too long");}oma_browser_load(ob_id(ctx,argc,argv),s);JS_FreeCString(ctx,s);return JS_UNDEFINED;}
static JSValue ob_action(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){const char *s;if(argc<2)return JS_UNDEFINED;s=JS_ToCString(ctx,argv[1]);if(!s)return JS_EXCEPTION;oma_browser_action(ob_id(ctx,argc,argv),s);JS_FreeCString(ctx,s);return JS_UNDEFINED;}
static JSValue ob_scroll(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){int dy=0;if(argc>1)JS_ToInt32(ctx,&dy,argv[1]);oma_browser_scroll(ob_id(ctx,argc,argv),dy);return JS_UNDEFINED;}
static JSValue ob_state(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){int id=ob_id(ctx,argc,argv);const char *s=oma_browser_string(id,0);JSValue o;if(!s)return JS_NULL;o=JS_NewObject(ctx);JS_SetPropertyStr(ctx,o,"url",JS_NewString(ctx,s));JS_SetPropertyStr(ctx,o,"title",JS_NewString(ctx,oma_browser_string(id,1)));JS_SetPropertyStr(ctx,o,"error",JS_NewString(ctx,oma_browser_string(id,2)));JS_SetPropertyStr(ctx,o,"width",JS_NewInt32(ctx,oma_browser_dimension(id,0)));JS_SetPropertyStr(ctx,o,"height",JS_NewInt32(ctx,oma_browser_dimension(id,1)));JS_SetPropertyStr(ctx,o,"ready",JS_NewBool(ctx,oma_browser_dimension(id,2)));JS_SetPropertyStr(ctx,o,"inputAccepted",JS_NewInt32(ctx,oma_browser_dimension(id,3)));JS_SetPropertyStr(ctx,o,"loading",JS_NewBool(ctx,oma_browser_loading(id)));return o;}
static JSValue ob_takeFocus(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){return JS_NewInt32(ctx,oma_browser_take_focus());}
static JSValue ob_click(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){int x=-1,y=-1;if(argc>=3){JS_ToInt32(ctx,&x,argv[1]);JS_ToInt32(ctx,&y,argv[2]);}return JS_NewBool(ctx,oma_browser_click(ob_id(ctx,argc,argv),x,y));}
static JSValue ob_text(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){const char *s;int ok;if(argc<2)return JS_FALSE;s=JS_ToCString(ctx,argv[1]);if(!s)return JS_EXCEPTION;ok=oma_browser_text(ob_id(ctx,argc,argv),s);JS_FreeCString(ctx,s);return JS_NewBool(ctx,ok);}
static int oma_install_browser(JSContext *ctx,JSValueConst global){JSValue o=JS_NewObject(ctx);
#define OB(name,argc) JS_SetPropertyStr(ctx,o,#name,JS_NewCFunction(ctx,ob_##name,#name,argc))
 OB(click,3);OB(text,2);OB(takeFocus,0);OB(open,1);OB(close,1);OB(focus,1);OB(layout,6);OB(load,2);OB(action,2);OB(scroll,2);OB(state,1);
#undef OB
 return JS_SetPropertyStr(ctx,global,"omaBrowser",o)>=0;}
#endif
