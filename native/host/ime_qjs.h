#ifndef OMA_IME_QJS_H
#define OMA_IME_QJS_H
static int oma_composing,oma_shortcut_count,oma_keep_alive;
int pocket_runtime_background_busy(void){return oma_keep_alive;}
static JSValue oma_js_keep_alive(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){(void)self;oma_keep_alive=argc>0&&JS_ToBool(ctx,argv[0])>0;return JS_UNDEFINED;}
static struct {char key[16];int mods;} oma_shortcuts[32];
int pocket_runtime_composing(void){return oma_composing;}
void pocket_runtime_shortcut(const char *key,int mods){int i=oma_shortcut_count;if(i>=32)return;snprintf(oma_shortcuts[i].key,16,"%s",key);oma_shortcuts[i].mods=mods;oma_shortcut_count++;}
static JSValue oma_js_shortcuts(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){JSValue a=JS_NewArray(ctx);int i;(void)self;(void)argc;(void)argv;for(i=0;i<oma_shortcut_count;i++){JSValue v=JS_NewObject(ctx);JS_SetPropertyStr(ctx,v,"key",JS_NewString(ctx,oma_shortcuts[i].key));JS_SetPropertyStr(ctx,v,"mods",JS_NewInt32(ctx,oma_shortcuts[i].mods));JS_SetPropertyUint32(ctx,a,i,v);}oma_shortcut_count=0;return a;}
static JSValue oma_js_composing(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv){(void)self;oma_composing=argc>0&&JS_ToBool(ctx,argv[0])>0;return JS_UNDEFINED;}
static int oma_install_ime(JSContext *ctx,JSValueConst object){JSValue api=JS_NewObject(ctx);JS_SetPropertyStr(ctx,api,"keepAlive",JS_NewCFunction(ctx,oma_js_keep_alive,"keepAlive",1));JS_SetPropertyStr(ctx,api,"compose",JS_NewCFunction(ctx,oma_js_composing,"compose",1));JS_SetPropertyStr(ctx,api,"shortcuts",JS_NewCFunction(ctx,oma_js_shortcuts,"shortcuts",0));return JS_SetPropertyStr(ctx,object,"omaInput",api)>=0;}
#endif
