#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

void jsparse (const char* buf, size_t buf_len, void (*jsparse_callback_)(const char *));

#ifdef __cplusplus
}
#endif