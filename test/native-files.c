#include "../native/host/files_posix.h"
#include <assert.h>
#include <sys/time.h>
static void put(const char *name,const void *bytes,size_t n) {FILE *f=fopen(name,"wb");assert(f);assert(fwrite(bytes,1,n,f)==n);fclose(f);}
int main(void) {
  char temp[]="/tmp/omaberry-files-XXXXXX";char *folder=mkdtemp(temp);assert(folder);assert(chdir(folder)==0);
  assert(mkdir("z-dir",0700)==0);put("a.txt","hello\n",6);put(".hidden","x",1);put("binary","\177ELF\0abc",8);
  assert(symlink("a.txt","linked")==0);assert(symlink("missing","broken")==0);assert(mkfifo("pipe",0600)==0);
  oma_file_list list=oma_files_list(".");assert(!list.error[0] && list.count==7);assert(list.entries[0].directory);assert(!strcmp(list.entries[0].name,"z-dir"));
  int linked=0;for(size_t i=0;i<list.count;i++)if(!strcmp(list.entries[i].name,"linked"))linked=list.entries[i].link;assert(linked);oma_files_free(&list);
  list=oma_files_list("z-dir");assert(!list.error[0] && list.count==0);oma_files_free(&list);list=oma_files_list("missing");assert(list.error[0]);oma_files_free(&list);
  oma_file_content file=oma_file_read("linked");assert(file.link && !file.binary && !file.error[0] && file.length==6 && !memcmp(file.data,"hello\n",6));free(file.data);
  file=oma_file_read("binary");assert(file.binary && file.size==8);free(file.data);
  file=oma_file_read("pipe");assert(file.error[0] && !file.data);file=oma_file_read("z-dir");assert(file.error[0]);file=oma_file_read("broken");assert(file.error[0]);
  unsigned char *large=malloc(OMA_FILE_BYTES+10);assert(large);memset(large,'x',OMA_FILE_BYTES+10);large[OMA_FILE_BYTES-1]=0xe4;large[OMA_FILE_BYTES]=0xb8;large[OMA_FILE_BYTES+1]=0xad;put("large.txt",large,OMA_FILE_BYTES+10);free(large);
  file=oma_file_read("large.txt");assert(file.truncated && !file.binary && file.length==OMA_FILE_BYTES-1);free(file.data);
  unlink("a.txt");unlink(".hidden");unlink("binary");unlink("linked");unlink("broken");unlink("pipe");unlink("large.txt");rmdir("z-dir");assert(chdir("/")==0);assert(rmdir(folder)==0);
  puts("Files: sorted directories, hidden files, links, text/binary, missing/special files, bounded UTF-8 preview passed");
}
