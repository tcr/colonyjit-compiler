#include <stdio.h>

auto test () {
	return true;
}

auto isIdentifierStart (auto code) {
    if (code < 65) return code == 36;
    if (code < 91) return true;
    if (code < 97) return code == 95;
    if (code < 123)return true;
    return code >= 0xaa;// && test(nonASCIIidentifierStart, fromCharCode(String, code));
  };

typedef struct {
	const char* type;
} rando_t;

int main (void)
{

  auto _num = {.type = "num"};

  printf("what %s\n", _num.type);

	printf("test: %d\n", isIdentifierStart(26));
	printf("test: %d\n", isIdentifierStart(36));
	return 0;
}