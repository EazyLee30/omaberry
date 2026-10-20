#ifndef OMA_FILE_WRITE_POSIX_H
#define OMA_FILE_WRITE_POSIX_H
#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>
#ifndef OMA_WRITE_FSYNC
#define OMA_WRITE_FSYNC fsync
#endif
#ifndef OMA_WRITE_RENAME
#define OMA_WRITE_RENAME rename
#endif
#ifndef OMA_VOLATILE_ROOT
#define OMA_VOLATILE_ROOT "/dev/shmem"
#endif
typedef struct {int ok,atomic;char error[160];} oma_write_result;
static int oma_write_all(int fd,const char *text,size_t n){size_t done=0;while(done<n){ssize_t count=write(fd,text+done,n-done);if(count<0&&errno==EINTR)continue;if(count<=0)return 0;done+=(size_t)count;}return 1;}
static int oma_volatile_parent(const char *path){char resolved[PATH_MAX],*parent=strdup(path),*slash;int ok=0;if(!parent)return 0;slash=strrchr(parent,'/');if(slash){if(slash==parent)slash[1]=0;else *slash=0;}else strcpy(parent,".");if(realpath(parent,resolved)){size_t n=strlen(OMA_VOLATILE_ROOT);ok=!strncmp(resolved,OMA_VOLATILE_ROOT,n)&&(resolved[n]==0||resolved[n]=='/');}free(parent);return ok;}
static oma_write_result oma_write_file(const char *path,const char *text,size_t n){oma_write_result result;char *temp;int fd,ok,saved=0;struct stat st;memset(&result,0,sizeof(result));
 if(!path||!*path||n>65536){snprintf(result.error,sizeof(result.error),"Invalid path or file exceeds 64 KiB");return result;}
 temp=malloc(strlen(path)+16);if(!temp){snprintf(result.error,sizeof(result.error),"Out of memory");return result;}sprintf(temp,"%s.oma-XXXXXX",path);fd=mkstemp(temp);
 if(fd<0){saved=errno;free(temp);snprintf(result.error,sizeof(result.error),"%s",strerror(saved));return result;}
 if(stat(path,&st)==0)fchmod(fd,st.st_mode&0777);
 ok=oma_write_all(fd,text,n);if(!ok)saved=errno;
 if(ok&&OMA_WRITE_FSYNC(fd)!=0&&errno!=ENOSYS&&errno!=EINVAL){ok=0;saved=errno;}
 if(close(fd)!=0&&ok){ok=0;saved=errno;}
 if(ok){if(OMA_WRITE_RENAME(temp,path)==0){result.ok=result.atomic=1;}else{saved=errno;
  /* QNX /tmp is /dev/shmem. Its resource manager supports file writes,
   * but rename/link and fsync can return ENOLINK/ENOSYS. Report the
   * non-atomic fallback explicitly, only for this volatile filesystem. */
  if((saved==ENOLINK||saved==ENOSYS||saved==EXDEV||saved==ENOTSUP)&&oma_volatile_parent(path)){
   fd=open(path,O_WRONLY|O_CREAT|O_TRUNC,0600);if(fd>=0){ok=oma_write_all(fd,text,n);if(!ok)saved=errno;if(close(fd)!=0){ok=0;saved=errno;}result.ok=ok;}else saved=errno;
  }
 }}
 if(!result.atomic)unlink(temp);if(!result.ok)snprintf(result.error,sizeof(result.error),"%s",strerror(saved?saved:EIO));free(temp);return result;
}
#endif
