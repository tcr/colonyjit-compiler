#include "gum.c"
#include "compiled.c"



/**
 * main
 */


int main () {
	std::string INPUT = "console.log('hi');";
	{
		input = INPUT; inputLen = input.length();
	    // setOptions(opts);
	    initTokenState();
	    node_t* top = parseTopLevel(options.program);
	    printf("ok %s\n", top->type.c_str());
	}
	printf("done.\n");
	return 0;
}