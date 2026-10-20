#define OMA_EXEC_SHELL "/bin/sh"
#include "../native/host/exec_posix.h"
#include <assert.h>
static void finish(void){for(int i=0;i<700&&ox_state==1;i++){ox_poll();usleep(10000);}assert(ox_state==2);}
int main(void){assert(ox_start("pwd; printf '\\nhello'; printf ' error' >&2; exit 7","/tmp",5));assert(!ox_start("echo nope","/tmp",1));finish();assert(strstr(ox_output,"hello error"));assert(ox_code==7);assert(ox_start("yes x | head -c 20000","/tmp",5));finish();assert(ox_truncated&&ox_length==OMA_EXEC_LIMIT);assert(ox_start("sleep 10","/tmp",1));finish();assert(ox_code==124);assert(ox_start("sleep 10","/tmp",30));ox_cancel();assert(ox_state==3&&ox_pid<0&&ox_fd<0);assert(!ox_start("pwd","relative",1));assert(ox_start("pwd","/no-such-omaberry-directory",1));finish();assert(ox_code==126);puts("Exec: cwd, stderr, exit, busy, bounded output, timeout, cancel, invalid directory passed");}
