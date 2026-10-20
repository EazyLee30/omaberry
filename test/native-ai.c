static char test_curl_path[512];
#define OMA_AI_CURL test_curl_path
#include "../native/host/ai_posix.h"
#include <assert.h>
#include <sys/stat.h>
static void script(const char *body) {FILE *f=fopen(test_curl_path,"w");assert(f);fputs("#!/bin/sh\n/bin/cat >/dev/null\n",f);fputs(body,f);fclose(f);assert(chmod(test_curl_path,0700)==0);}
static void finish(void){for(int i=0;i<400 && ai_state==1;i++){ai_poll();usleep(10000);}assert(ai_state==2);}
int main(void) {
 char folder[]="/tmp/oma-ai-XXXXXX";assert(mkdtemp(folder));snprintf(test_curl_path,sizeof(test_curl_path),"%s/curl",folder);
 script("/usr/bin/printf '%s\\n200' '{\"choices\":[{\"message\":{\"content\":\"ok\"}}]}'\n");
 assert(ai_start("test-private-token","{\"messages\":[{\"content\":\"quoted \\\"text\\\"\"}]}"));assert(!ai_start("ignored","{}"));finish();assert(ai_status==200 && !ai_error[0] && strstr((char *)ai_response,"\"ok\""));
 script("/bin/sleep 5\n");assert(ai_start("test","{}"));ai_cancel();assert(ai_state==3 && ai_pid<0 && ai_out<0);
 script("exit 28\n");assert(ai_start("test","{}"));finish();assert(strstr(ai_error,"timed out"));
 script("/usr/bin/head -c 270000 /dev/zero\n");assert(ai_start("test","{}"));finish();assert(strstr(ai_error,"256 KiB"));
 assert(!ai_start("bad\nheader","{}"));assert(ai_state==2);ai_cancel();unlink(test_curl_path);rmdir(folder);
 puts("AI transport: async response/status, busy exclusion, cancel, timeout, bounded body and header validation passed");
}
