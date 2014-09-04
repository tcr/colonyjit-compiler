#include "jsparser.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stddef.h>

void my_onopennode (const char* fn) {
  // printf("type %s\n", fn);
  // printf("-> enter %s\n", fn);
}

void my_onclosenode (struct Node_C C) {
  printf("type %s\n", C.type);
  // printf("<- finish %s %s '%s' %d\n", C.type, C.name, C.value_string, C.arguments);
}

int main (int argc, char **argv)
{
  if (argc < 1) {
    printf("Usage: test path.js\n");
    return 1;
  }

  // Read in a file.
  FILE *fp;
  fp = fopen(argv[1], "rb");
  if (fp == NULL) {
    printf("no file found\n");
    return 1;
  }
  fseek(fp, 0, SEEK_END); // seek to end of file
  size_t input_len = ftell(fp); // get current file pointer
  fseek(fp, 0, SEEK_SET); // seek back to beginning of file
  char* input = (char*) malloc(input_len);
  fread(input, input_len, 1, fp);
  fclose(fp);

  // parse dat
  jsparse(input, input_len, my_onopennode, my_onclosenode);

  printf("done.\n");

  free(input);
  return 0;
}