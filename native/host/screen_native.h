#ifndef OMA_SCREEN_NATIVE_H
#define OMA_SCREEN_NATIVE_H
#include <stddef.h>
#ifdef __cplusplus
extern "C" {
#endif
int oma_host_active(void);
int oma_host_click(int x,int y);
int oma_host_text(const char *text,size_t length);
unsigned long oma_screen_request(void);
const char *oma_screen_poll(void);
void oma_screen_render(int width,int height,unsigned long frame);
void oma_screen_present(int success);
void oma_screen_clear(void);
#ifdef __cplusplus
}
#endif
#endif
