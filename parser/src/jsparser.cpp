#include "jsparser.h"

void (*jsparse_callback_open)(const char* fn) = NULL;
void (*jsparse_callback_close)(struct Node_C C) = NULL;

// Include source
#include "helper.c"
#include "compiled.c"

void jsparse (const char* buf, size_t buf_len,
	void (*jsparse_callback_open_)(const char* fn),
	void (*jsparse_callback_close_)(struct Node_C C))
{
	jsparse_callback_open = jsparse_callback_open_;
	jsparse_callback_close = jsparse_callback_close_;
	input = buf; inputLen = buf_len;
    // setOptions(opts);
    initTokenState();
    parseTopLevel(options.program);
}
