#include "jsparser.h"

void (*jsparse_callback)(const char *) = NULL;

// Include source
#include "helper.c"
#include "compiled.c"

void jsparse (const char* buf, size_t buf_len, void (*jsparse_callback_)(const char *))
{
	jsparse_callback = jsparse_callback_;
	input = buf; inputLen = buf_len;
    // setOptions(opts);
    initTokenState();
    parseTopLevel(options.program);
}
