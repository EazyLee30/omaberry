#ifndef OMABERRY_TERMINAL_POSIX_H
#define OMABERRY_TERMINAL_POSIX_H
#include <errno.h>
#include <fcntl.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <termios.h>
#include <unistd.h>
#ifdef __QNXNTO__
#include <unix.h>
#elif defined(__APPLE__)
#include <util.h>
#else
#include <pty.h>
#endif
/* BB10 exports the primitives dynamically, but its archived forkpty is not PIC.
 * Open a legacy master/slave pair and establish the controlling terminal here. */
#ifdef __QNXNTO__
static pid_t oma_forkpty(int *master, struct winsize *size) {
  int m = -1, slave = -1, i; pid_t pid;
  char path[] = "/dev/ptyp0";
  for (i = 0; i < 128; i++) {
    path[8] = (char)('p' + i / 16); path[9] = "0123456789abcdef"[i % 16];
    m = open(path, O_RDWR | O_NOCTTY);
    if (m >= 0) break;
  }
  if (m < 0) return -1;
  path[5] = 't';
  slave = open(path, O_RDWR | O_NOCTTY);
  if (slave < 0) { int saved = errno; close(m); errno = saved; return -1; }
  if (ioctl(slave, TIOCSWINSZ, size) < 0) { int saved = errno; close(m); close(slave); errno = saved; return -1; }
  pid = fork();
  if (pid == 0) {
    close(m);
    if (setsid() < 0 || tcsetsid(slave, getpid()) < 0) _exit(126);
    if (dup2(slave, 0) < 0 || dup2(slave, 1) < 0 || dup2(slave, 2) < 0) _exit(126);
    if (slave > 2) close(slave);
    return 0;
  }
  close(slave);
  if (pid < 0) { int saved = errno; close(m); errno = saved; return -1; }
  *master = m; return pid;
}
#else
static pid_t oma_forkpty(int *master, struct winsize *size) { return forkpty(master, NULL, NULL, size); }
#endif
#ifndef OMA_SHELL
#define OMA_SHELL "/bin/ksh"
#endif
#ifndef OMA_BERRYCORE
#define OMA_BERRYCORE "/accounts/1000/shared/misc/berrycore"
#endif
#ifndef OMA_HOME
#define OMA_HOME "/accounts/1000/shared"
#endif
#define OMA_TERMINALS 16
typedef struct { int fd,exit_code,focused;pid_t pid;unsigned long read_bytes,written_bytes;char error[160];unsigned char pending[4096];size_t pending_len; } oma_terminal_state;
static oma_terminal_state oma_sessions[OMA_TERMINALS]={
  {.fd=-1,.exit_code=-1,.pid=-1},
  {.fd=-1,.exit_code=-1,.pid=-1},
  {.fd=-1,.exit_code=-1,.pid=-1},
  {.fd=-1,.exit_code=-1,.pid=-1},
  {.fd=-1,.exit_code=-1,.pid=-1},
  {.fd=-1,.exit_code=-1,.pid=-1},
  {.fd=-1,.exit_code=-1,.pid=-1},
  {.fd=-1,.exit_code=-1,.pid=-1},
  {.fd=-1,.exit_code=-1,.pid=-1},
  {.fd=-1,.exit_code=-1,.pid=-1},
  {.fd=-1,.exit_code=-1,.pid=-1},
  {.fd=-1,.exit_code=-1,.pid=-1},
  {.fd=-1,.exit_code=-1,.pid=-1},
  {.fd=-1,.exit_code=-1,.pid=-1},
  {.fd=-1,.exit_code=-1,.pid=-1},
  {.fd=-1,.exit_code=-1,.pid=-1}
};
static int oma_slot;
#define oma_fd (oma_sessions[oma_slot].fd)
#define oma_exit (oma_sessions[oma_slot].exit_code)
#define oma_focused (oma_sessions[oma_slot].focused)
#define oma_pid (oma_sessions[oma_slot].pid)
#define oma_read_bytes (oma_sessions[oma_slot].read_bytes)
#define oma_written_bytes (oma_sessions[oma_slot].written_bytes)
#define oma_error (oma_sessions[oma_slot].error)
#define oma_pending (oma_sessions[oma_slot].pending)
#define oma_pending_len (oma_sessions[oma_slot].pending_len)
static void oma_flush(void) {
  while (oma_fd >= 0 && oma_pending_len > 0) {
    ssize_t n = write(oma_fd, oma_pending, oma_pending_len);
    if (n < 0 && errno == EINTR) continue;
    if (n < 0 && (errno == EAGAIN || errno == EWOULDBLOCK)) return;
    if (n <= 0) { snprintf(oma_error, sizeof(oma_error), "PTY write: %s", strerror(errno)); return; }
    oma_written_bytes += (unsigned long)n;
    oma_pending_len -= (size_t)n;
    memmove(oma_pending, oma_pending + n, oma_pending_len);
  }
}
static void oma_close(void) {
  pid_t pid = oma_pid;
  oma_focused = 0;
  if (oma_fd >= 0) close(oma_fd);
  oma_fd = -1; oma_pending_len = 0;
  if (pid > 0) {
    int status, attempt;
    kill(-pid, SIGHUP); kill(pid, SIGTERM);
    for (attempt = 0; attempt < 20; attempt++) {
      pid_t reaped = waitpid(pid, &status, WNOHANG);
      if (reaped == pid || (reaped < 0 && errno == ECHILD)) break;
      usleep(10000);
    }
    if (attempt == 20) { kill(pid, SIGKILL); while (waitpid(pid, &status, 0) < 0 && errno == EINTR) {} }
  }
  oma_pid = -1;
}
static int oma_open_at(const char *cwd) {
  struct winsize size;
  struct termios settings;
  pid_t pid;
  int master = -1, flags;
  char *const args[] = {OMA_SHELL, "-i", NULL};
  char *const env[] = {
    "HOME=" OMA_HOME, "SHELL=" OMA_SHELL,
    "ENV=" OMA_BERRYCORE "/env.sh", "NATIVE_TOOLS=" OMA_BERRYCORE,
    "PATH=" OMA_BERRYCORE "/bin:/usr/bin:/bin:/usr/sbin:/sbin",
    "LD_LIBRARY_PATH=/usr/lib:/lib:" OMA_BERRYCORE "/target_10_3_1_995/qnx6/armle-v7/usr/lib:" OMA_BERRYCORE "/lib",
    "TERM=vt100", "TERMINFO=" OMA_BERRYCORE "/share/terminfo",
    "LANG=en_US.UTF-8", "LC_ALL=en_US.UTF-8", "PS1=$ ",
    "BERRYCORE_QUIET=1", "BERRYCORE_SETUP_AUTO=0", "BERRYCORE_MOTD_ENABLED=0", NULL
  };
  if (oma_pid > 0) return 1;
  if (oma_fd >= 0) oma_close();
  oma_error[0] = 0; oma_exit = -1; oma_read_bytes = oma_written_bytes = 0;
  memset(&size, 0, sizeof(size)); size.ws_col = 42; size.ws_row = 11;
  pid = oma_forkpty(&master, &size);
  if (pid < 0) { snprintf(oma_error, sizeof(oma_error), "PTY open: %s", strerror(errno)); return 0; }
  if (pid == 0) {
    /* Only async-signal-safe calls between fork and exec in the GLES process. */
    if (chdir(cwd && *cwd ? cwd : OMA_HOME) < 0) {
      const char message[] = "\r\nUnable to enter shell directory\r\n"; write(2, message, sizeof(message)-1); _exit(126);
    }
    execve(OMA_SHELL, args, env);
    { const char message[] = "\r\nUnable to execute shell\r\n"; write(2, message, sizeof(message) - 1); }
    _exit(127);
  }
  oma_pid = pid; oma_fd = master;
  flags = fcntl(master, F_GETFL, 0);
  if (flags < 0 || fcntl(master, F_SETFL, flags | O_NONBLOCK) < 0) {
    snprintf(oma_error, sizeof(oma_error), "PTY nonblocking: %s", strerror(errno)); oma_close(); return 0;
  }
  fcntl(master, F_SETFD, FD_CLOEXEC);
  if (tcgetattr(master, &settings) == 0) {
    settings.c_cc[VERASE] = 0x7f;
    tcsetattr(master, TCSANOW, &settings);
  }
  return 1;
}
static int oma_open(void) { return oma_open_at(NULL); }
static int oma_resize(int cols,int rows) {
  struct winsize size;
  if(oma_fd<0 || cols<8 || cols>80 || rows<2 || rows>40)return 0;
  memset(&size,0,sizeof(size));size.ws_col=(unsigned short)cols;size.ws_row=(unsigned short)rows;
  if(ioctl(oma_fd,TIOCSWINSZ,&size)<0){snprintf(oma_error,sizeof(oma_error),"PTY resize: %s",strerror(errno));return 0;}
  return 1;
}
static int oma_write(const unsigned char *bytes, size_t length) {
  if (oma_fd < 0 || oma_pid <= 0) return 0;
  oma_flush();
  if (length > sizeof(oma_pending) - oma_pending_len) { snprintf(oma_error, sizeof(oma_error), "PTY input queue is full"); return 0; }
  memcpy(oma_pending + oma_pending_len, bytes, length); oma_pending_len += length;
  oma_flush(); return oma_error[0] == 0;
}
static size_t oma_read(unsigned char *out, size_t capacity) {
  size_t used = 0;
  int status;
  oma_flush();
  while (oma_fd >= 0 && used < capacity) {
    ssize_t n = read(oma_fd, out + used, capacity - used);
    if (n > 0) { used += (size_t)n; oma_read_bytes += (unsigned long)n; continue; }
    if (n < 0 && errno == EINTR) continue;
    if (n < 0 && errno != EAGAIN && errno != EWOULDBLOCK && errno != EIO)
      snprintf(oma_error, sizeof(oma_error), "PTY read: %s", strerror(errno));
    break;
  }
  if (oma_pid > 0 && waitpid(oma_pid, &status, WNOHANG) == oma_pid) {
    oma_exit = WIFEXITED(status) ? WEXITSTATUS(status) : 128 + WTERMSIG(status);
    oma_pid = -1; oma_focused = 0;

  }
  if (oma_pid < 0 && oma_fd >= 0 && used < capacity) { close(oma_fd); oma_fd=-1; }
  return used;
}
#endif
