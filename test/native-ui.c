#include "../native/host/ui_eval.h"
#include <assert.h>
static void good(const char *source,const char *needle){oma_ui_result r=oma_ui_evaluate(source,"{\"count\":2}");if(!r.json)fprintf(stderr,"%s\n",r.error);assert(r.json&&strstr(r.json,needle));free(r.json);}
static void bad(const char *source){oma_ui_result r=oma_ui_evaluate(source,"{}");assert(!r.json&&r.error[0]);}
int main(void){good("return {view:ui.Text('native '+state.count)};","native 2");good("return {view:ui.Text(typeof omaExec+' '+typeof std+' '+typeof fetch)};","undefined undefined undefined");bad("return {broken;");bad("while(true){}");bad("const a=[];while(true)a.push(new Array(10000).fill('x'));");bad("const a={};a.a=a;return a;");bad("return {text:'x'.repeat(70000)};");good("return {view:ui.Button('Again',{type:'increment',key:'count',by:1})};","Again");puts("Native UI: real QuickJS execution, isolated globals, state, syntax/runtime failure, deadline, memory/output bounds and recovery passed");}
