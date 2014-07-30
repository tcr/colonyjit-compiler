#include "jsparser.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stddef.h>

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
  jsparse(input, input_len);

  free(input);
  return 0;
}