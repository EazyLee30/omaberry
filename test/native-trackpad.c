#include <assert.h>
#include <stdio.h>
#include "../native/host/trackpad_motion.h"
int main(void){oma_trackpad_motion m={0};assert(!oma_trackpad_step(&m,1,0,100));assert(!oma_trackpad_step(&m,1,0,110));assert(oma_trackpad_step(&m,1,0,120)==2);assert(!oma_trackpad_step(&m,20,0,130));assert(oma_trackpad_step(&m,0,0,200)==2);assert(oma_trackpad_step(&m,0,-4,280)==1);assert(oma_trackpad_step(&m,-4,2,360)==4);assert(!oma_trackpad_step(&m,1,0,440));assert(!oma_trackpad_step(&m,-1,0,450));assert(oma_trackpad_step(&m,-2,0,460)==4);puts("Trackpad: small movement accumulation, dominant axis, reversal, no rapid focus cascade");}
