#include <assert.h>
/* BBNDK 10.3.1 key symbols. The helper itself has no SDK dependency. */
#define KEYCODE_BACKSPACE 0xF008
#define KEYCODE_RETURN 0xF00D
#include "text_key.h"
int main(void) {
  assert(text_codepoint_for_key(' ') == ' ');
  assert(text_codepoint_for_key('a') == 'a');
  assert(text_codepoint_for_key(KEYCODE_BACKSPACE) == 8);
  assert(text_codepoint_for_key(KEYCODE_RETURN) == 10);
  assert(text_codepoint_for_key(0xF051) == 0); /* QNX navigation key */
  assert(text_codepoint_for_key(0xF0E1) == 0); /* modifier */
  assert(text_codepoint_for_key(0x4E2D) == 0x4E2D);
  assert(text_codepoint_for_key(0x20000) == 0x20000); /* supplementary CJK */
  assert(text_codepoint_for_key(0x1F600) == 0x1F600);
  assert(text_codepoint_for_key(0xD800) == 0);
  assert(text_codepoint_for_key(0x110000) == 0);
  assert(text_codepoint_for_key(0x7F) == 0);
  assert(text_codepoint_for_key(-1) == 0);
  return 0;
}
