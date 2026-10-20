#define OMA_SHELL "/bin/sh"
#define OMA_HOME "/tmp"
#include "../native/host/terminal_posix.h"
#include <assert.h>
static char result[65536];
static int until(const char *needle) {
  size_t total=0; int i;
  memset(result,0,sizeof(result));
  for(i=0;i<300;i++) { size_t n=oma_read((unsigned char *)result+total,sizeof(result)-total-1);total+=n;result[total]=0;if(strstr(result,needle))return 1;usleep(10000); }
  fprintf(stderr,"Missing %s in %s\n",needle,result);return 0;
}
static void command(const char *text) {assert(oma_write((const unsigned char *)text,strlen(text)));}
int main(void) {
  assert(oma_open()); assert(oma_pid>0);assert(isatty(oma_fd));oma_focused=1;
  command("printf 'PTY_%s\\n' OK; test -t 0 && printf 'TTY_%s\\n' YES\r");assert(until("TTY_YES"));assert(strstr(result,"PTY_OK"));
  struct winsize resized;
  assert(oma_resize(42,6));assert(ioctl(oma_fd,TIOCGWINSZ,&resized)==0);assert(resized.ws_row==6&&resized.ws_col==42);
  assert(oma_resize(42,19));assert(ioctl(oma_fd,TIOCGWINSZ,&resized)==0);assert(resized.ws_row==19);
  assert(!oma_resize(0,0));
  command("cd /; printf 'CWD_%s\\n' \"$PWD\"\r");assert(until("CWD_/"));
  command("printf 'KEEP_%s\\n' \"$PWD\"\r");assert(until("KEEP_/"));
  command("sleep 20\r");usleep(100000);command("\003");command("printf 'INT_%s\\n' OK\r");assert(until("INT_OK"));
  command("exit 7\r");for(int i=0;i<200 && oma_pid>0;i++){unsigned char data[1024];oma_read(data,sizeof(data));usleep(10000);}assert(oma_exit==7);assert(!oma_focused);oma_close();assert(oma_open());oma_close();assert(oma_pid<0 && oma_fd<0);
  oma_slot=0;assert(oma_open());pid_t first=oma_pid;command("cd /; printf 'WS0_%s\\n' \"$PWD\"\r");assert(until("WS0_/"));
  oma_slot=1;assert(oma_open());assert(oma_pid!=first);command("cd /tmp; printf 'WS1_%s\\n' \"$PWD\"\r");assert(until("WS1_/tmp"));
  oma_slot=2;assert(oma_open());assert(oma_pid!=first);command("printf 'WS2_%s\\n' READY\r");assert(until("WS2_READY"));
  oma_slot=0;command("printf 'RETAIN_%s\\n' \"$PWD\"\r");assert(until("RETAIN_/"));
  for(oma_slot=3;oma_slot<OMA_TERMINALS;oma_slot++){assert(oma_open());command("printf 'EXTRA_%s\\n' READY\r");assert(until("EXTRA_READY"));}
  for(oma_slot=0;oma_slot<OMA_TERMINALS;oma_slot++)oma_close();oma_slot=0;
  puts("PTY: real tty, persistent cwd, Ctrl-C, exit and restart passed");
}
