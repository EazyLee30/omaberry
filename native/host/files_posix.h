#ifndef OMABERRY_FILES_POSIX_H
#define OMABERRY_FILES_POSIX_H
#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>
#define OMA_FILES_MAX 4096
#define OMA_FILE_BYTES 65536
#ifndef OMA_FILES_ROOT
#define OMA_FILES_ROOT "/accounts/1000/shared/misc/berrycore"
#endif
typedef struct { char *name; int directory, link; double size; } oma_file_entry;
typedef struct { oma_file_entry *entries; size_t count; int limited; char error[160]; } oma_file_list;
static int oma_file_compare(const void *a, const void *b) {
  const oma_file_entry *x = (const oma_file_entry *)a, *y = (const oma_file_entry *)b;
  if (x->directory != y->directory) return y->directory - x->directory;
  return strcmp(x->name, y->name);
}
static void oma_files_free(oma_file_list *list) {
  size_t i; for(i=0;i<list->count;i++) free(list->entries[i].name);
  free(list->entries); list->entries=NULL;list->count=0;
}
static oma_file_list oma_files_list(const char *path) {
  oma_file_list result; DIR *dir; struct dirent *item;
  memset(&result,0,sizeof(result));
  dir=opendir(path);
  if(!dir) {snprintf(result.error,sizeof(result.error),"%s",strerror(errno));return result;}
  result.entries=(oma_file_entry *)calloc(OMA_FILES_MAX,sizeof(oma_file_entry));
  if(!result.entries) {closedir(dir);snprintf(result.error,sizeof(result.error),"Out of memory");return result;}
  for(;;) {
    char *full; size_t length; struct stat st, lst; oma_file_entry *entry;
    errno=0;item=readdir(dir);
    if(!item) {if(errno)snprintf(result.error,sizeof(result.error),"%s",strerror(errno));break;}
    if(!strcmp(item->d_name,".") || !strcmp(item->d_name,".."))continue;
    if(result.count==OMA_FILES_MAX) {result.limited=1;break;}
    length=strlen(path)+strlen(item->d_name)+2;
    full=(char *)malloc(length);
    if(!full) {snprintf(result.error,sizeof(result.error),"Out of memory");break;}
    snprintf(full,length,"%s/%s",path,item->d_name);
    memset(&st,0,sizeof(st));memset(&lst,0,sizeof(lst));
    lstat(full,&lst);stat(full,&st);free(full);
    entry=&result.entries[result.count];entry->name=strdup(item->d_name);
    if(!entry->name) {snprintf(result.error,sizeof(result.error),"Out of memory");break;}
    entry->directory=S_ISDIR(st.st_mode);entry->link=S_ISLNK(lst.st_mode);entry->size=(double)st.st_size;
    result.count++;
  }
  closedir(dir);qsort(result.entries,result.count,sizeof(oma_file_entry),oma_file_compare);return result;
}
typedef struct { unsigned char *data; size_t length; double size; int binary, truncated, link; char error[160]; } oma_file_content;
static oma_file_content oma_file_read(const char *path) {
  oma_file_content result;struct stat st,lst;int fd;size_t i;
  memset(&result,0,sizeof(result));
  /* Nonblocking open plus fstat prevents FIFOs/devices from blocking the UI. */
  fd=open(path,O_RDONLY|O_NONBLOCK);
  if(fd<0) {snprintf(result.error,sizeof(result.error),"%s",strerror(errno));return result;}
  if(fstat(fd,&st)<0) {snprintf(result.error,sizeof(result.error),"%s",strerror(errno));close(fd);return result;}
  result.size=(double)st.st_size;
  if(lstat(path,&lst)==0) result.link=S_ISLNK(lst.st_mode);
  if(!S_ISREG(st.st_mode)) {snprintf(result.error,sizeof(result.error),"Only regular files can be previewed");close(fd);return result;}
  result.data=(unsigned char *)malloc(OMA_FILE_BYTES+1);
  if(!result.data) {snprintf(result.error,sizeof(result.error),"Out of memory");close(fd);return result;}
  while(result.length<OMA_FILE_BYTES+1) {
    ssize_t n=read(fd,result.data+result.length,OMA_FILE_BYTES+1-result.length);
    if(n>0) {result.length+=(size_t)n;continue;}
    if(n<0 && errno==EINTR)continue;
    if(n<0)snprintf(result.error,sizeof(result.error),"%s",strerror(errno));
    break;
  }
  close(fd);result.truncated=result.length>OMA_FILE_BYTES;
  if(result.truncated)result.length=OMA_FILE_BYTES;
  for(i=0;i<result.length;i++) {
    unsigned char c=result.data[i];
    if(c==0 || (c<32 && c!=9 && c!=10 && c!=13 && c!=12)) {result.binary=1;break;}
  }
  /* Keep a truncated UTF-8 scalar out of QuickJS's decoder. */
  if(result.truncated && result.length) {
    size_t lead=result.length-1,need;unsigned char first;
    while(lead>0 && (result.data[lead]&0xc0)==0x80)lead--;
    first=result.data[lead];need=first<0xe0?2:first<0xf0?3:4;
    if(first>=0xc2 && first<=0xf4 && result.length-lead<need)result.length=lead;
  }
  return result;
}
#endif
