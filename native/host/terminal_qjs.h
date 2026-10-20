#ifndef OMABERRY_TERMINAL_QJS_H
#define OMABERRY_TERMINAL_QJS_H
#include "terminal_posix.h"
static unsigned char oma_utf_tails[OMA_TERMINALS][4];
static size_t oma_utf_tail_lengths[OMA_TERMINALS];
#define oma_utf_tail oma_utf_tails[oma_slot]
#define oma_utf_tail_len oma_utf_tail_lengths[oma_slot]
static void oma_select(JSContext *ctx,int argc,JSValueConst *argv,int index) {
  int32_t slot=0;
  if(argc>index)JS_ToInt32(ctx,&slot,argv[index]);
  oma_slot=slot>=0 && slot<OMA_TERMINALS?slot:0;
}
int pocket_runtime_terminal_focused(void) { int i;for(i=0;i<OMA_TERMINALS;i++)if(oma_sessions[i].focused)return 1;return 0; }
void pocket_runtime_terminal_unfocus(void) { int i;for(i=0;i<OMA_TERMINALS;i++)oma_sessions[i].focused=0; }
static JSValue oma_js_open(JSContext *ctx, JSValueConst self, int argc, JSValueConst *argv) {
  (void)self; (void)argc; (void)argv;
  oma_select(ctx,argc,argv,0);oma_utf_tail_len = 0;
  return JS_NewBool(ctx, oma_open());
}
static JSValue oma_js_close(JSContext *ctx, JSValueConst self, int argc, JSValueConst *argv) {
  (void)self; oma_select(ctx,argc,argv,0); oma_close(); oma_utf_tail_len = 0; return JS_UNDEFINED;
}
static JSValue oma_js_focus(JSContext *ctx, JSValueConst self, int argc, JSValueConst *argv) {
  (void)self; oma_select(ctx,argc,argv,1);if(argc>0 && JS_ToBool(ctx,argv[0])>0)pocket_runtime_terminal_unfocus(); oma_focused = argc > 0 && JS_ToBool(ctx, argv[0]) > 0 && oma_pid > 0;
  return JS_NewBool(ctx, oma_focused);
}
static JSValue oma_js_resize(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv) {
  int32_t cols=42,rows=11;(void)self;oma_select(ctx,argc,argv,2);
  if(argc<2)return JS_FALSE;
  JS_ToInt32(ctx,&cols,argv[0]);JS_ToInt32(ctx,&rows,argv[1]);
  return JS_NewBool(ctx,oma_resize(cols,rows));
}
static JSValue oma_js_write(JSContext *ctx, JSValueConst self, int argc, JSValueConst *argv) {
  const char *text; size_t length; int ok;
  (void)self;
  oma_select(ctx,argc,argv,1);
  if (argc < 1) return JS_FALSE;
  text = JS_ToCStringLen(ctx, &length, argv[0]);
  if (text == NULL) return JS_EXCEPTION;
  ok = oma_write((const unsigned char *)text, length);
  JS_FreeCString(ctx, text); return JS_NewBool(ctx, ok);
}
static JSValue oma_js_poll(JSContext *ctx, JSValueConst self, int argc, JSValueConst *argv) {
  unsigned char bytes[8196]; size_t length, end, lead;
  JSValue result = JS_NewObject(ctx);
  (void)self; (void)argc; (void)argv;
  oma_select(ctx,argc,argv,0);
  memcpy(bytes, oma_utf_tail, oma_utf_tail_len);
  length = oma_utf_tail_len + oma_read(bytes + oma_utf_tail_len, 8192);
  end = length;
  if (end > 0) {
    lead = end - 1;
    while (lead > 0 && (bytes[lead] & 0xc0) == 0x80) lead--;
    { unsigned char first = bytes[lead]; size_t need = first < 0x80 ? 1 : first < 0xe0 ? 2 : first < 0xf0 ? 3 : 4;
      if (first >= 0xc2 && first <= 0xf4 && end - lead < need) end = lead; }
  }
  oma_utf_tail_len = length - end;
  memcpy(oma_utf_tail, bytes + end, oma_utf_tail_len);
  JS_SetPropertyStr(ctx, result, "data", JS_NewStringLen(ctx, (const char *)bytes, end));
  JS_SetPropertyStr(ctx, result, "state", JS_NewString(ctx, oma_error[0] ? "error" : oma_pid > 0 ? "open" : oma_exit >= 0 ? "exited" : "closed"));
  JS_SetPropertyStr(ctx, result, "error", JS_NewString(ctx, oma_error));
  JS_SetPropertyStr(ctx, result, "pid", JS_NewInt32(ctx, oma_pid));
  JS_SetPropertyStr(ctx, result, "exitCode", JS_NewInt32(ctx, oma_exit));
  JS_SetPropertyStr(ctx, result, "focused", JS_NewBool(ctx, oma_focused));
  JS_SetPropertyStr(ctx, result, "bytesRead", JS_NewFloat64(ctx, oma_read_bytes));
  JS_SetPropertyStr(ctx, result, "bytesWritten", JS_NewFloat64(ctx, oma_written_bytes));
  return result;
}
static int oma_install_terminal(JSContext *ctx, JSValueConst object) {
  JSValue api = JS_NewObject(ctx);
  JS_SetPropertyStr(ctx,api,"resize",JS_NewCFunction(ctx,oma_js_resize,"resize",3));
  if (JS_IsException(api)) return 0;
  JS_SetPropertyStr(ctx, api, "open", JS_NewCFunction(ctx, oma_js_open, "open", 0));
  JS_SetPropertyStr(ctx, api, "close", JS_NewCFunction(ctx, oma_js_close, "close", 0));
  JS_SetPropertyStr(ctx, api, "focus", JS_NewCFunction(ctx, oma_js_focus, "focus", 1));
  JS_SetPropertyStr(ctx, api, "write", JS_NewCFunction(ctx, oma_js_write, "write", 1));
  JS_SetPropertyStr(ctx, api, "poll", JS_NewCFunction(ctx, oma_js_poll, "poll", 0));
  return JS_SetPropertyStr(ctx, object, "omaTerminal", api) >= 0;
}
#endif
