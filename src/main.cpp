#include "helper.c"
#include "compiled.c"

#include <sstream>
#include <string>
#include <fstream>
#include <streambuf>


/**
 * main
 */


int main () {
	std::ifstream t("../src/input.js");
	std::stringstream INPUT;
	INPUT << t.rdbuf();

	// std::string INPUT = "console.log('hi', 5);";
	{
		input = INPUT.str(); inputLen = input.length();
	    // setOptions(opts);
	    initTokenState();
	    Node* top = parseTopLevel(options.program);
	    printf("ok %s\n", top->type.c_str());
	}
	printf("done.\n");
	return 0;
}