#ifndef OMA_TRACKPAD_MOTION_H
#define OMA_TRACKPAD_MOTION_H
#include <stdlib.h>
/* Accumulate small movements and emit one dominant-axis step per interval. */
typedef struct {int x,y;unsigned long last;} oma_trackpad_motion;
static int oma_trackpad_step(oma_trackpad_motion *m,int dx,int dy,unsigned long now){
 if((dx<0&&m->x>0)||(dx>0&&m->x<0))m->x=0;
 if((dy<0&&m->y>0)||(dy>0&&m->y<0))m->y=0;
 m->x+=dx;m->y+=dy;
 if(now-m->last<70|| (abs(m->x)<3&&abs(m->y)<3))return 0;
 {int result=abs(m->x)>=abs(m->y)?(m->x>0?2:4):(m->y>0?3:1);m->x=m->y=0;m->last=now;return result;}
}
#endif
