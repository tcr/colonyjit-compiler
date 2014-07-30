#include "jsparser.h"

#include "helper.c"
#include "compiled.c"

void jsparse (const char* buf, size_t buf_len)
{
	input = buf; inputLen = buf_len;
    // setOptions(opts);
    initTokenState();
    Node* top = parseTopLevel(options.program);
    printf("ok %s\n", top->type.c_str());
	printf("done.\n");
}
