#ifndef OMA_AI_POSIX_H
#define OMA_AI_POSIX_H
#include <errno.h>
#include <fcntl.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>
#ifndef OMA_AI_CURL
#define OMA_AI_CURL "/accounts/1000/shared/misc/berrycore/bin/curl.bin"
#endif
#ifndef OMA_AI_CA
#define OMA_AI_CA "/accounts/1000/shared/misc/berrycore/ssl/cert.pem"
#endif
#define OMA_AI_LIMIT 262144
static pid_t ai_pid=-1;
static int ai_out=-1,ai_err=-1,ai_state,ai_status,ai_code;
static unsigned char ai_response[OMA_AI_LIMIT+1];
static size_t ai_length;
static char ai_error[256];
static time_t ai_started;
/* curl's config arrives through an unlinked private FILE on stdin. Neither
 * the bearer token nor the prompt appears in argv, logs, or persistent files. */
static void ai_quote(FILE *file,const char *value) {
  const unsigned char *p=(const unsigned char *)value;
  fputc('"',file);
  for(;*p;p++) {
    if(*p=='"' || *p=='\\') {fputc('\\',file);fputc(*p,file);}
    else if(*p=='\n') fputs("\\n",file);
    else if(*p=='\r') fputs("\\r",file);
    else fputc(*p,file);
  }
  fputc('"',file);
}
static void ai_close_fds(void) {if(ai_out>=0)close(ai_out);if(ai_err>=0)close(ai_err);ai_out=ai_err=-1;}
static void ai_cancel(void) {
  if(ai_pid>0) {int status;kill(ai_pid,SIGKILL);while(waitpid(ai_pid,&status,0)<0 && errno==EINTR){};ai_pid=-1;}
  ai_close_fds();ai_state=3;
}
static int ai_start(const char *key,const char *body) {
  FILE *config;int output[2]={-1,-1},errors[2]={-1,-1};pid_t pid;
  char *const args[]={OMA_AI_CURL,"--disable","--config","-","--silent","--show-error","--max-time","60","--connect-timeout","12","--max-filesize","262144","--write-out","\n%{http_code}","--cacert",OMA_AI_CA,NULL};
  char *const env[]={"HOME=/accounts/1000/shared","PATH=/bin:/usr/bin","LANG=en_US.UTF-8","LD_LIBRARY_PATH=/usr/lib:/lib:/accounts/1000/shared/misc/berrycore/lib",NULL};
  if(ai_pid>0)return 0;
  ai_close_fds();ai_error[0]=0;ai_length=0;ai_status=0;ai_code=0;
  if(!key || !*key || strchr(key,'\n') || strchr(key,'\r')) {snprintf(ai_error,sizeof(ai_error),"DeepSeek key is missing or invalid");ai_state=2;return 0;}
  config=tmpfile();
  if(!config) {snprintf(ai_error,sizeof(ai_error),"Private request: %s",strerror(errno));ai_state=2;return 0;}
  fputs("url = \"https://api.deepseek.com/chat/completions\"\nheader = \"Content-Type: application/json\"\nheader = ",config);
  {char header[256];if(strlen(key)>200) {fclose(config);snprintf(ai_error,sizeof(ai_error),"Invalid key length");ai_state=2;return 0;}snprintf(header,sizeof(header),"Authorization: Bearer %s",key);ai_quote(config,header);memset(header,0,sizeof(header));}
  fputs("\ndata-binary = ",config);ai_quote(config,body);fputc('\n',config);
  if(fflush(config) || fseek(config,0,SEEK_SET) || pipe(output)<0 || pipe(errors)<0) {
    snprintf(ai_error,sizeof(ai_error),"Request pipe: %s",strerror(errno));fclose(config);if(output[0]>=0){close(output[0]);close(output[1]);}ai_state=2;return 0;
  }
  fcntl(fileno(config),F_SETFD,FD_CLOEXEC);
  pid=fork();
  if(pid==0) {
    dup2(fileno(config),0);dup2(output[1],1);dup2(errors[1],2);
    close(output[0]);close(output[1]);close(errors[0]);close(errors[1]);
    execve(OMA_AI_CURL,args,env);_exit(127);
  }
  fclose(config);close(output[1]);close(errors[1]);
  if(pid<0) {close(output[0]);close(errors[0]);snprintf(ai_error,sizeof(ai_error),"Request process: %s",strerror(errno));ai_state=2;return 0;}
  ai_pid=pid;ai_out=output[0];ai_err=errors[0];ai_state=1;ai_started=time(NULL);
  if(fcntl(ai_out,F_SETFL,O_NONBLOCK)<0 || fcntl(ai_err,F_SETFL,O_NONBLOCK)<0) {ai_cancel();snprintf(ai_error,sizeof(ai_error),"Unable to make request nonblocking");ai_state=2;return 0;}
  fcntl(ai_out,F_SETFD,FD_CLOEXEC);fcntl(ai_err,F_SETFD,FD_CLOEXEC);return 1;
}
static void ai_poll(void) {
  int status,read_count=0;ssize_t n;unsigned char buffer[4096];
  if(ai_state!=1)return;
  while(ai_out>=0 && read_count++<8) {
    n=read(ai_out,buffer,sizeof(buffer));
    if(n>0) {
      if((size_t)n>OMA_AI_LIMIT-ai_length){ai_cancel();snprintf(ai_error,sizeof(ai_error),"Response exceeds 256 KiB");ai_state=2;return;}
      memcpy(ai_response+ai_length,buffer,(size_t)n);ai_length+=(size_t)n;continue;
    }
    if(n==0){close(ai_out);ai_out=-1;}
    if(n<0 && errno==EINTR)continue;
    break;
  }
  if(ai_err>=0) {
    /* Curl's diagnostics can include local paths; expose only its exit code. */
    while((n=read(ai_err,buffer,sizeof(buffer)))>0){}
    if(n==0){close(ai_err);ai_err=-1;}
  }
  if(ai_pid>0 && waitpid(ai_pid,&status,WNOHANG)==ai_pid) {ai_code=WIFEXITED(status)?WEXITSTATUS(status):128+WTERMSIG(status);ai_pid=-1;}
  if(ai_pid<=0 && ai_out<0) {
    ai_response[ai_length]=0;ai_state=2;
    if(ai_length>=4 && ai_response[ai_length-4]=='\n') {ai_status=atoi((char *)ai_response+ai_length-3);ai_length-=4;ai_response[ai_length]=0;}
    if(ai_code)snprintf(ai_error,sizeof(ai_error),ai_code==28?"Request timed out":"HTTPS transport failed (curl %d)",ai_code);
    ai_close_fds();
  }
  if(ai_pid>0 && time(NULL)-ai_started>65) {ai_cancel();snprintf(ai_error,sizeof(ai_error),"Request timed out");ai_state=2;}
}
#endif
