#ifndef OMA_BROWSER_NATIVE_H
#define OMA_BROWSER_NATIVE_H
#include <screen/screen.h>
#include <bps/bps.h>
#ifdef __cplusplus
extern "C" {
#endif
void oma_browser_init(int argc,char **argv,void (*events)(bps_event_t *));
void oma_browser_pump(int wait);
void oma_browser_shutdown(void);
int oma_browser_open(int id);
void oma_browser_close(int id);
void oma_browser_load(int id,const char *url);
void oma_browser_layout(int id,int x,int y,int w,int h,int visible);
void oma_browser_focus(int id);
int oma_browser_take_focus(void);
void oma_browser_action(int id,const char *name);
void oma_browser_scroll(int id,int dy);
const char *oma_browser_string(int id,int field);
int oma_browser_loading(int id);
int oma_browser_dimension(int id,int field);
int oma_browser_click(int id,int x,int y);
int oma_browser_text(int id,const char *text);
int oma_browser_key(screen_event_t event);
int oma_browser_touch(screen_event_t event,int type);
int oma_browser_pointer(int dx,int dy,int down);
void oma_browser_render(int width,int height);
#ifdef __cplusplus
}
#endif
#endif
