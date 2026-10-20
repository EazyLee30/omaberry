#ifndef OMA_EXEC_POSIX_H
#define OMA_EXEC_POSIX_H
#include <errno.h>
#include <fcntl.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>
#ifndef OMA_EXEC_SHELL
#define OMA_EXEC_SHELL "/bin/ksh"
#endif
#define OMA_EXEC_LIMIT 16384
static pid_t ox_pid=-1,ox_group=-1;
static int ox_fd=-1,ox_state,ox_code,ox_truncated,ox_timeout;
static size_t ox_length;
static char ox_output[OMA_EXEC_LIMIT+1],ox_error[160];
static time_t ox_started;
static void ox_cancel(void){int status;if(ox_group>0)kill(-ox_group,SIGKILL);if(ox_pid>0){kill(ox_pid,SIGKILL);while(waitpid(ox_pid,&status,0)<0&&errno==EINTR){}}if(ox_fd>=0)close(ox_fd);ox_pid=ox_group=-1;ox_fd=-1;ox_state=3;}
static int ox_start(const char *command,const char *cwd,int timeout){int output[2];pid_t pid;
 if(ox_state==1)return 0;ox_error[0]=0;ox_length=0;ox_output[0]=0;ox_truncated=0;ox_code=-1;
 if(!command||strlen(command)>8192||!cwd||cwd[0]!='/'){snprintf(ox_error,sizeof(ox_error),"Invalid command or absolute working directory");ox_state=2;return 0;}
 if(pipe(output)<0){snprintf(ox_error,sizeof(ox_error),"pipe: %s",strerror(errno));ox_state=2;return 0;}
 pid=fork();if(pid==0){int fd;char *const args[]={OMA_EXEC_SHELL,"-c",(char *)command,NULL};char *const env[]={"HOME=/accounts/1000/shared","PATH=/accounts/1000/shared/misc/berrycore/bin:/bin:/usr/bin:/base/usr/bin","LD_LIBRARY_PATH=/accounts/1000/shared/misc/berrycore/lib:/usr/lib:/lib","LANG=en_US.UTF-8","TERM=dumb",NULL};
  setsid();dup2(output[1],1);dup2(output[1],2);close(output[0]);close(output[1]);fd=open("/dev/null",O_RDONLY);if(fd>=0){dup2(fd,0);if(fd>2)close(fd);}if(chdir(cwd)<0){perror("cwd");_exit(126);}execve(OMA_EXEC_SHELL,args,env);perror("exec");_exit(127);
 }
 close(output[1]);if(pid<0){close(output[0]);snprintf(ox_error,sizeof(ox_error),"fork: %s",strerror(errno));ox_state=2;return 0;}
 ox_pid=ox_group=pid;ox_fd=output[0];fcntl(ox_fd,F_SETFD,FD_CLOEXEC);if(fcntl(ox_fd,F_SETFL,O_NONBLOCK)<0){ox_cancel();snprintf(ox_error,sizeof(ox_error),"Nonblocking pipe unavailable");ox_state=2;return 0;}ox_state=1;ox_started=time(NULL);ox_timeout=timeout<1?1:timeout>60?60:timeout;return 1;
}
static void ox_poll(void){char buf[2048];int status,i;ssize_t n;if(ox_state!=1)return;
 for(i=0;i<8&&ox_fd>=0;i++){n=read(ox_fd,buf,sizeof(buf));if(n>0){size_t keep=(size_t)n;if(keep>OMA_EXEC_LIMIT-ox_length){keep=OMA_EXEC_LIMIT-ox_length;ox_truncated=1;}memcpy(ox_output+ox_length,buf,keep);ox_length+=keep;ox_output[ox_length]=0;continue;}if(n==0){close(ox_fd);ox_fd=-1;}if(n<0&&errno==EINTR)continue;break;}
 if(ox_pid>0&&waitpid(ox_pid,&status,WNOHANG)==ox_pid){ox_code=WIFEXITED(status)?WEXITSTATUS(status):128+WTERMSIG(status);ox_pid=-1;}
 if(ox_pid<0&&ox_fd<0){if(ox_group>0)kill(-ox_group,SIGKILL);ox_group=-1;ox_state=2;return;}
 if(time(NULL)-ox_started>=(time_t)ox_timeout){ox_cancel();ox_state=2;ox_code=124;snprintf(ox_error,sizeof(ox_error),"Command timed out");}
}
#endif
