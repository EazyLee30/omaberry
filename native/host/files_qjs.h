#ifndef OMABERRY_FILES_QJS_H
#define OMABERRY_FILES_QJS_H
#include "files_posix.h"
static JSValue oma_js_files_list(JSContext *ctx, JSValueConst self, int argc, JSValueConst *argv) {
  const char *path; oma_file_list list; JSValue result,array;size_t i;
  (void)self;
  if(argc<1)return JS_ThrowTypeError(ctx,"Expected a directory path");
  path=JS_ToCString(ctx,argv[0]);if(!path)return JS_EXCEPTION;
  list=oma_files_list(path);JS_FreeCString(ctx,path);
  result=JS_NewObject(ctx);array=JS_NewArray(ctx);
  for(i=0;i<list.count;i++) {
    JSValue entry=JS_NewObject(ctx);
    JS_SetPropertyStr(ctx,entry,"name",JS_NewString(ctx,list.entries[i].name));
    JS_SetPropertyStr(ctx,entry,"directory",JS_NewBool(ctx,list.entries[i].directory));
    JS_SetPropertyStr(ctx,entry,"link",JS_NewBool(ctx,list.entries[i].link));
    JS_SetPropertyStr(ctx,entry,"size",JS_NewFloat64(ctx,list.entries[i].size));
    JS_SetPropertyUint32(ctx,array,(uint32_t)i,entry);
  }
  JS_SetPropertyStr(ctx,result,"entries",array);
  JS_SetPropertyStr(ctx,result,"error",JS_NewString(ctx,list.error));
  JS_SetPropertyStr(ctx,result,"limited",JS_NewBool(ctx,list.limited));
  oma_files_free(&list);return result;
}
static JSValue oma_js_files_read(JSContext *ctx, JSValueConst self, int argc, JSValueConst *argv) {
  const char *path;oma_file_content file;JSValue result;
  (void)self;
  if(argc<1)return JS_ThrowTypeError(ctx,"Expected a file path");
  path=JS_ToCString(ctx,argv[0]);if(!path)return JS_EXCEPTION;
  file=oma_file_read(path);JS_FreeCString(ctx,path);result=JS_NewObject(ctx);
  JS_SetPropertyStr(ctx,result,"text",JS_NewStringLen(ctx,file.binary || !file.data?"":(const char *)file.data,file.binary?0:file.length));
  JS_SetPropertyStr(ctx,result,"size",JS_NewFloat64(ctx,file.size));
  JS_SetPropertyStr(ctx,result,"binary",JS_NewBool(ctx,file.binary));
  JS_SetPropertyStr(ctx,result,"truncated",JS_NewBool(ctx,file.truncated));
  JS_SetPropertyStr(ctx,result,"link",JS_NewBool(ctx,file.link));
  JS_SetPropertyStr(ctx,result,"error",JS_NewString(ctx,file.error));
  free(file.data);return result;
}
static int oma_install_files(JSContext *ctx, JSValueConst object) {
  JSValue api=JS_NewObject(ctx);
  JS_SetPropertyStr(ctx,api,"root",JS_NewString(ctx,OMA_FILES_ROOT));
  JS_SetPropertyStr(ctx,api,"list",JS_NewCFunction(ctx,oma_js_files_list,"list",1));
  JS_SetPropertyStr(ctx,api,"read",JS_NewCFunction(ctx,oma_js_files_read,"read",1));
  return JS_SetPropertyStr(ctx,object,"omaFiles",api)>=0;
}
#endif
