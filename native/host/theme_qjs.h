#ifndef OMA_THEME_QJS_H
#define OMA_THEME_QJS_H
/* The only preference here is the wallpaper index; never reads private AI config. */
static JSValue oma_theme_get(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv) {
  FILE *file=fopen("data/wallpaper","r");int value=0;(void)self;(void)argc;(void)argv;
  if(file){if(fscanf(file,"%d",&value)!=1)value=0;fclose(file);}if(value<0||value>3)value=0;
  return JS_NewInt32(ctx,value);
}
static JSValue oma_theme_set(JSContext *ctx,JSValueConst self,int argc,JSValueConst *argv) {
  int32_t value;int fd,ok;FILE *file;(void)self;
  if(argc<1||JS_ToInt32(ctx,&value,argv[0])<0||value<0||value>3)return JS_FALSE;
  fd=open("data/wallpaper.tmp",O_WRONLY|O_CREAT|O_TRUNC,0600);if(fd<0)return JS_FALSE;
  file=fdopen(fd,"w");if(!file){close(fd);return JS_FALSE;}
  ok=fprintf(file,"%d\n",value)>0;if(fclose(file)!=0)ok=0;
  if(ok)ok=rename("data/wallpaper.tmp","data/wallpaper")==0;
  if(!ok)unlink("data/wallpaper.tmp");return JS_NewBool(ctx,ok);
}
static int oma_install_theme(JSContext *ctx,JSValueConst object) {
  JSValue api=JS_NewObject(ctx);
  JS_SetPropertyStr(ctx,api,"get",JS_NewCFunction(ctx,oma_theme_get,"get",0));
  JS_SetPropertyStr(ctx,api,"set",JS_NewCFunction(ctx,oma_theme_set,"set",1));
  return JS_SetPropertyStr(ctx,object,"omaTheme",api)>=0;
}
#endif
