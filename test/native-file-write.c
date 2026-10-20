#include <errno.h>
#include <stdio.h>
#include <unistd.h>
static int unsupported_sync,unsupported_rename;
static char volatile_root[1024];
static int test_sync(int fd){if(unsupported_sync){errno=ENOSYS;return -1;}return fsync(fd);}
static int test_rename(const char *a,const char *b){if(unsupported_rename){errno=ENOLINK;return -1;}return rename(a,b);}
#define OMA_WRITE_FSYNC test_sync
#define OMA_WRITE_RENAME test_rename
#define OMA_VOLATILE_ROOT volatile_root
#include "../native/host/file_write_posix.h"
#include <assert.h>
int main(void){char dir[]="/tmp/oma-write-XXXXXX",path[1024],resolved[1024],buf[80];FILE *f;oma_write_result r;assert(mkdtemp(dir));assert(realpath(dir,resolved));strcpy(volatile_root,"/not-volatile");snprintf(path,sizeof(path),"%s/file",dir);r=oma_write_file(path,"first",5);assert(r.ok&&r.atomic);unsupported_sync=1;r=oma_write_file(path,"second",6);assert(r.ok&&r.atomic);unsupported_rename=1;r=oma_write_file(path,"failure",7);assert(!r.ok);strcpy(volatile_root,resolved);r=oma_write_file(path,"QNX fallback",12);assert(r.ok&&!r.atomic);f=fopen(path,"r");assert(f);assert(fread(buf,1,80,f)==12);fclose(f);assert(!memcmp(buf,"QNX fallback",12));r=oma_write_file(path,"",0);assert(r.ok&&!r.atomic);r=oma_write_file(path,"x",65537);assert(!r.ok);unlink(path);rmdir(dir);puts("File writes: atomic replace, unsupported fsync, QNX volatile rename fallback, contents, empty file, bounded writes passed");}
